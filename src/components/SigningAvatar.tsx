import { useEffect, useMemo, useRef, useState } from 'react'
import type { Gloss, NonManual } from '../data/document'

/**
 * A signing avatar drawn head-to-waist against a flat stage.
 *
 * Framing rule from the scope doc: the face is never cropped and the space above
 * the head stays clear so hands can move into it. The viewBox below reserves the
 * top ~100 units for exactly that.
 *
 * Motion is generated, not recorded: each gloss token seeds a deterministic hand
 * position and handshape, and arms are solved with two-bone IK so the same sign
 * always signs the same way. Non-manual markers drive the brows, mouth and head,
 * because in NZSL that is where the grammar lives.
 */

const VIEW_W = 420
const VIEW_H = 470

// Shoulder joints. Left/right are the viewer's, so the signer's dominant right
// hand appears on the viewer's left.
const SHOULDER_L = { x: 152, y: 262 } // signer's right arm
const SHOULDER_R = { x: 268, y: 262 } // signer's left arm
const UPPER = 88
const FORE = 84

const HEAD = { x: 210, y: 152, rx: 52, ry: 60 }

const SKIN = '#E8C9AE'
const SKIN_SHADE = '#D9B295'
const SKIN_LINE = '#C39C7D'
const SHIRT = '#1F2A33'

interface Vec {
  x: number
  y: number
}

/* ─────────────────────────── Handshapes ───────────────────────────
 * A handshape is four finger curls (index → pinky), a thumb curl, how far the
 * thumb swings away from the palm, and how widely the fingers fan. Because all
 * seven values are numeric, one handshape can be interpolated into the next,
 * which is what makes the transitions read as a hand changing shape rather than
 * a sprite swapping.
 *
 * The inventory below is the common BANZSL/NZSL set, named by its usual labels.
 */
interface Shape {
  curls: [number, number, number, number]
  thumbCurl: number
  thumbOut: number
  spread: number
}

const HANDSHAPES: Record<string, Shape> = {
  // Flat hand, fingers together — B
  flat: { curls: [0.04, 0, 0.04, 0.1], thumbCurl: 0.4, thumbOut: 0.15, spread: 0.15 },
  // Open spread hand — 5
  spread: { curls: [0.05, 0, 0.05, 0.12], thumbCurl: 0.1, thumbOut: 1, spread: 1 },
  // Closed fist — A / S
  fist: { curls: [1, 1, 1, 1], thumbCurl: 0.55, thumbOut: 0.25, spread: 0 },
  // Index point — 1 / G
  point: { curls: [0.02, 1, 1, 1], thumbCurl: 0.8, thumbOut: 0.15, spread: 0.1 },
  // Index and middle extended — 2 / V
  v: { curls: [0.03, 0.03, 1, 1], thumbCurl: 0.85, thumbOut: 0.15, spread: 0.85 },
  // Curved open hand — C
  curved: { curls: [0.42, 0.4, 0.42, 0.46], thumbCurl: 0.3, thumbOut: 0.85, spread: 0.4 },
  // Closed round hand — O
  o: { curls: [0.7, 0.68, 0.7, 0.72], thumbCurl: 0.85, thumbOut: 0.55, spread: 0.15 },
  // Bent claw — 5-claw
  claw: { curls: [0.5, 0.48, 0.5, 0.54], thumbCurl: 0.35, thumbOut: 0.9, spread: 0.9 },
  // Thumb extended, fingers closed — thumb-up
  thumb: { curls: [1, 1, 1, 1], thumbCurl: 0, thumbOut: 0.7, spread: 0 },
  // Thumb and index in contact — F / 9
  pinch: { curls: [0.72, 0.08, 0.08, 0.12], thumbCurl: 0.7, thumbOut: 0.45, spread: 0.5 },
  // Relaxed hanging hand, used at rest
  rest: { curls: [0.28, 0.32, 0.36, 0.4], thumbCurl: 0.3, thumbOut: 0.3, spread: 0.25 },
}

const LEXICAL_SHAPES = ['flat', 'spread', 'point', 'v', 'curved', 'o', 'claw', 'fist', 'pinch']
// Fingerspelling leans on the tighter, more distinct shapes.
const SPELLED_SHAPES = ['point', 'v', 'flat', 'fist', 'o', 'pinch']

/** Any pose that does not carry a well-formed handshape falls back to rest. */
const asShape = (s: Shape): Shape => (s?.curls?.length === 4 ? s : HANDSHAPES.rest)

const lerpShape = (rawA: Shape, rawB: Shape, t: number): Shape => {
  const a = asShape(rawA)
  const b = asShape(rawB)
  return {
    curls: [0, 1, 2, 3].map((i) => lerp(a.curls[i], b.curls[i], t)) as Shape['curls'],
    thumbCurl: lerp(a.thumbCurl, b.thumbCurl, t),
    thumbOut: lerp(a.thumbOut, b.thumbOut, t),
    spread: lerp(a.spread, b.spread, t),
  }
}

/* ─────────────────────────── Hand rendering ─────────────────────── */

// Local hand space: wrist at the origin, fingers pointing up (−y).
const KNUCKLES: { x: number; y: number; fan: number; len: number }[] = [
  { x: -11, y: -33, fan: -7, len: 30 }, // index
  { x: -2, y: -36, fan: -1.5, len: 33 }, // middle
  { x: 7, y: -34, fan: 4, len: 30 }, // ring
  { x: 15.5, y: -29, fan: 11, len: 24 }, // pinky
]

// Proportions of each finger's length taken by proximal / middle / distal.
const PHALANX = [0.42, 0.33, 0.25]
// How far each joint folds at full curl, in degrees.
const JOINT_BEND = [58, 68, 46]

const deg = (d: number) => ((d - 90) * Math.PI) / 180

/** Forward kinematics down one finger, returning the joint chain. */
const fingerChain = (
  origin: Vec,
  baseAngle: number,
  length: number,
  curl: number,
): { points: Vec[]; widths: number[] } => {
  const points: Vec[] = [origin]
  let angle = baseAngle
  let p = origin
  for (let i = 0; i < 3; i++) {
    angle += curl * JOINT_BEND[i]
    const l = length * PHALANX[i]
    p = { x: p.x + Math.cos(deg(angle)) * l, y: p.y + Math.sin(deg(angle)) * l }
    points.push(p)
  }
  return { points, widths: [7.4, 6.4, 5.4] }
}

function Hand({ shape: raw, angle, mirror }: { shape: Shape; angle: number; mirror: boolean }) {
  // Guard the whole shape contract rather than trusting the caller: a pose that
  // predates a handshape change (hot reload, or a future gloss format) would
  // otherwise take the avatar down mid-sign.
  const shape = asShape(raw)

  const fingers = KNUCKLES.map((k, i) =>
    fingerChain(
      { x: k.x, y: k.y },
      k.fan * (0.35 + shape.spread * 1.25),
      k.len,
      shape.curls[i],
    ),
  )

  // The thumb sits on the far side of the palm, has two phalanges rather than
  // three, and swings out from the hand instead of folding across it.
  const thumbBase = { x: -18, y: -9 }
  const thumbAngle = -34 - shape.thumbOut * 30
  const t1 = {
    x: thumbBase.x + Math.cos(deg(thumbAngle + shape.thumbCurl * 26)) * 17,
    y: thumbBase.y + Math.sin(deg(thumbAngle + shape.thumbCurl * 26)) * 17,
  }
  const t2 = {
    x: t1.x + Math.cos(deg(thumbAngle + shape.thumbCurl * 74)) * 14,
    y: t1.y + Math.sin(deg(thumbAngle + shape.thumbCurl * 74)) * 14,
  }

  return (
    <g transform={`rotate(${angle}) ${mirror ? 'scale(-1 1)' : ''}`}>
      {/* Thumb is drawn first so it reads behind the palm mass. */}
      <path
        d={`M ${thumbBase.x} ${thumbBase.y} L ${t1.x} ${t1.y}`}
        stroke={SKIN}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${t1.x} ${t1.y} L ${t2.x} ${t2.y}`}
        stroke={SKIN}
        strokeWidth="8.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Palm */}
      <path
        d="M -19 2
           C -21 -12, -20 -26, -16 -34
           C -10 -40, 10 -40, 17 -33
           C 20 -25, 20 -10, 18 2
           C 14 9, -14 9, -19 2 Z"
        fill={SKIN}
      />
      {/* A single crease keeps the palm from reading as a flat cutout. */}
      <path
        d="M -13 -12 C -6 -6, 6 -6, 13 -13"
        stroke={SKIN_LINE}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />

      {/* Fingers, pinky first so the index sits on top. */}
      {[3, 2, 1, 0].map((i) => {
        const { points, widths } = fingers[i]
        return (
          <g key={i}>
            {[0, 1, 2].map((seg) => (
              <path
                key={seg}
                d={`M ${points[seg].x} ${points[seg].y} L ${points[seg + 1].x} ${points[seg + 1].y}`}
                stroke={SKIN}
                strokeWidth={widths[seg]}
                strokeLinecap="round"
                fill="none"
              />
            ))}
            {/* Knuckle shading — subtle, but it separates overlapping digits. */}
            <circle cx={points[1].x} cy={points[1].y} r={widths[0] / 2.4} fill={SKIN_SHADE} opacity="0.5" />
          </g>
        )
      })}

      {/* Wrist */}
      <path
        d="M -14 2 C -12 10, 12 10, 14 2 L 14 10 C 8 15, -8 15, -14 10 Z"
        fill={SKIN_SHADE}
      />
    </g>
  )
}

/* ─────────────────────────── Pose generation ────────────────────── */

interface Pose {
  right: Vec // signer's right hand (viewer left)
  left: Vec
  rightShape: Shape
  leftShape: Shape
  lean: number
}

const REST: Pose = {
  right: { x: 168, y: 400 },
  left: { x: 252, y: 400 },
  rightShape: HANDSHAPES.rest,
  leftShape: HANDSHAPES.rest,
  lean: 0,
}

/** Cheap deterministic hash so a given sign always signs the same way. */
const hash = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const rng = (seed: number) => {
  let s = seed || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

/**
 * Signing space: roughly the box from just above the head down to the waist and
 * a shoulder-width or so out to each side. Fingerspelled and numeric signs sit
 * lower and closer in; lexical signs range wider.
 */
const poseForSign = (gloss: Gloss, step: number): Pose => {
  const next = rng(hash(gloss.sign) + step * 7919)
  const fingerspelled = gloss.sign.startsWith('fs-')
  const numeric = /\d/.test(gloss.sign)
  const twoHanded = next() > (fingerspelled ? 0.85 : 0.42)
  const spread = fingerspelled || numeric ? 0.45 : 1

  const pool = fingerspelled ? SPELLED_SHAPES : LEXICAL_SHAPES
  const pick = () => HANDSHAPES[pool[Math.floor(next() * pool.length)]]

  const right = {
    x: 176 - next() * 74 * spread,
    y: 118 + next() * (numeric ? 130 : 210),
  }
  const left = twoHanded
    ? { x: 244 + next() * 74 * spread, y: right.y + (next() - 0.5) * 54 }
    : { x: 256 + next() * 12, y: 372 + next() * 26 }

  const rightShape = pick()
  return {
    right,
    left,
    rightShape,
    // Symmetrical two-handed signs usually share a handshape.
    leftShape: twoHanded ? (next() > 0.35 ? rightShape : pick()) : HANDSHAPES.rest,
    lean: (next() - 0.5) * 5,
  }
}

/** Two-bone IK. `flip` chooses which way the elbow breaks. */
const solveArm = (shoulder: Vec, target: Vec, flip: 1 | -1) => {
  const dx = target.x - shoulder.x
  const dy = target.y - shoulder.y
  const max = UPPER + FORE - 2
  const min = Math.abs(UPPER - FORE) + 6
  let dist = Math.hypot(dx, dy)
  let tx = target.x
  let ty = target.y
  if (dist > max) {
    tx = shoulder.x + (dx / dist) * max
    ty = shoulder.y + (dy / dist) * max
    dist = max
  } else if (dist < min) {
    const nx = dist === 0 ? 0 : dx / dist
    const ny = dist === 0 ? 1 : dy / dist
    tx = shoulder.x + nx * min
    ty = shoulder.y + ny * min
    dist = min
  }
  const base = Math.atan2(ty - shoulder.y, tx - shoulder.x)
  const cos = (UPPER * UPPER + dist * dist - FORE * FORE) / (2 * UPPER * dist)
  const bend = Math.acos(Math.max(-1, Math.min(1, cos)))
  const angle = base + flip * bend
  return {
    elbow: { x: shoulder.x + Math.cos(angle) * UPPER, y: shoulder.y + Math.sin(angle) * UPPER },
    hand: { x: tx, y: ty },
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
const lerpVec = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
// Ease in and out of each pose so the hold reads as a sign, not a waypoint.
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

interface Props {
  gloss: Gloss[]
  nmm: NonManual
  playing: boolean
  speed: number
  /** Restart motion when this changes. */
  cueKey: string
  dimmed?: boolean
}

export default function SigningAvatar({ gloss, nmm, playing, speed, cueKey, dimmed }: Props) {
  const [pose, setPose] = useState<Pose>(REST)
  const [breath, setBreath] = useState(0)
  const frame = useRef<number>(0)
  const start = useRef<number>(0)

  // Two poses per gloss token — a transition into the sign and a hold.
  const track = useMemo(() => {
    const poses: Pose[] = [REST]
    gloss.forEach((g) => {
      poses.push(poseForSign(g, 0))
      poses.push(poseForSign(g, 1))
    })
    poses.push(REST)
    return poses
  }, [gloss])

  useEffect(() => {
    start.current = 0
  }, [cueKey])

  useEffect(() => {
    if (!playing) return
    const perPose = 520 / Math.max(speed, 0.1)
    const tick = (now: number) => {
      if (!start.current) start.current = now
      const elapsed = now - start.current
      const total = track.length - 1
      const raw = (elapsed / perPose) % total
      const index = Math.floor(raw)
      const t = ease(raw - index)
      const a = track[index]
      const b = track[index + 1] ?? track[0]
      setPose({
        right: lerpVec(a.right, b.right, t),
        left: lerpVec(a.left, b.left, t),
        // Handshapes morph rather than snap — this is what sells the hands.
        rightShape: lerpShape(a.rightShape, b.rightShape, t),
        leftShape: lerpShape(a.leftShape, b.leftShape, t),
        lean: lerp(a.lean, b.lean, t),
      })
      setBreath(Math.sin(elapsed / 1400) * 2)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [playing, speed, track, cueKey])

  const armR = solveArm(SHOULDER_L, pose.right, -1)
  const armL = solveArm(SHOULDER_R, pose.left, 1)

  /** The wrist follows the forearm, so hands never float at odd angles. */
  const wristAngle = (elbow: Vec, hand: Vec) =>
    (Math.atan2(hand.y - elbow.y, hand.x - elbow.x) * 180) / Math.PI + 90

  // Non-manual features. These are grammar: brow raise marks a yes/no question,
  // furrow marks wh-, headshake marks negation, raised brows plus a head tilt
  // mark the topic.
  const browLift = nmm === 'brow-raise' || nmm === 'topic' ? -9 : 0
  const browFurrow = nmm === 'brow-furrow' ? 6 : 0
  const headTilt = nmm === 'topic' ? -3 : 0
  const shaking = playing && nmm === 'headshake'
  const mouthOpen = nmm === 'brow-raise' ? 7 : nmm === 'headshake' ? 3 : 5

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      style={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 240ms ease' }}
      role="img"
      aria-label="Signing avatar, shown from head to waist"
    >
      <defs>
        <clipPath id="stage-clip">
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
        </clipPath>
      </defs>

      <g clipPath="url(#stage-clip)">
        {/* Torso. Waist runs off the bottom edge — the figure is never cropped
            at the neck or shoulders. */}
        <g transform={`translate(0 ${breath}) rotate(${pose.lean} 210 300)`}>
          <path
            d={`M ${SHOULDER_L.x - 34} 300
                C ${SHOULDER_L.x - 30} 258, 176 240, 210 240
                C 244 240, ${SHOULDER_R.x + 30} 258, ${SHOULDER_R.x + 34} 300
                L 296 ${VIEW_H} L 124 ${VIEW_H} Z`}
            fill={SHIRT}
          />
          <path d="M 186 243 Q 210 268 234 243 L 228 238 Q 210 252 192 238 Z" fill="#2C3946" />

          {/* Neck */}
          <path d="M 190 210 h 40 v 34 q -20 14 -40 0 Z" fill={SKIN_SHADE} />

          {/* Head */}
          <g
            transform={`rotate(${headTilt} ${HEAD.x} 210)`}
            style={{
              transformOrigin: `${HEAD.x}px 215px`,
              ...(shaking
                ? { animation: `nzsl-headshake ${0.62 / speed}s ease-in-out infinite` }
                : {}),
            }}
          >
            <ellipse cx={HEAD.x} cy={HEAD.y} rx={HEAD.rx} ry={HEAD.ry} fill={SKIN} />
            <ellipse cx={HEAD.x - HEAD.rx} cy={HEAD.y + 8} rx="8" ry="13" fill={SKIN_SHADE} />
            <ellipse cx={HEAD.x + HEAD.rx} cy={HEAD.y + 8} rx="8" ry="13" fill={SKIN_SHADE} />
            <path
              d={`M ${HEAD.x - HEAD.rx - 2} ${HEAD.y - 12}
                  Q ${HEAD.x - 46} ${HEAD.y - 74}, ${HEAD.x} ${HEAD.y - 66}
                  Q ${HEAD.x + 48} ${HEAD.y - 74}, ${HEAD.x + HEAD.rx + 2} ${HEAD.y - 12}
                  Q ${HEAD.x + 36} ${HEAD.y - 44}, ${HEAD.x} ${HEAD.y - 40}
                  Q ${HEAD.x - 36} ${HEAD.y - 44}, ${HEAD.x - HEAD.rx - 2} ${HEAD.y - 12} Z`}
              fill="#2B2320"
            />

            {/* Brows carry question marking and topic marking. */}
            <g style={{ transition: 'transform 220ms ease' }} transform={`translate(0 ${browLift})`}>
              <path
                d={`M ${HEAD.x - 34} ${HEAD.y - 14 + browFurrow} q 14 ${-8 + browFurrow} 26 0`}
                stroke="#3A2E28"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={`M ${HEAD.x + 8} ${HEAD.y - 14 + browFurrow} q 12 ${-8 + browFurrow} 26 0`}
                stroke="#3A2E28"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            <ellipse cx={HEAD.x - 20} cy={HEAD.y + 2} rx="9" ry="6.5" fill="#FFFFFF" />
            <ellipse cx={HEAD.x + 20} cy={HEAD.y + 2} rx="9" ry="6.5" fill="#FFFFFF" />
            <circle cx={HEAD.x - 20} cy={HEAD.y + 2} r="4" fill="#1A1A1A" />
            <circle cx={HEAD.x + 20} cy={HEAD.y + 2} r="4" fill="#1A1A1A" />

            <path
              d={`M ${HEAD.x} ${HEAD.y + 6} q 5 14 -4 18`}
              stroke={SKIN_SHADE}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            <ellipse
              cx={HEAD.x}
              cy={HEAD.y + 36}
              rx={13}
              ry={playing ? mouthOpen : 3}
              fill="#8C4A46"
              style={{ transition: 'all 200ms ease' }}
            />
          </g>
        </g>

        {/* Arms, drawn after the torso so hands read in front of the body. */}
        {[
          { arm: armR, shoulder: SHOULDER_L, shape: pose.rightShape, mirror: false },
          { arm: armL, shoulder: SHOULDER_R, shape: pose.leftShape, mirror: true },
        ].map(({ arm, shoulder, shape, mirror }, i) => (
          <g key={i}>
            <path
              d={`M ${shoulder.x} ${shoulder.y} L ${arm.elbow.x} ${arm.elbow.y}`}
              stroke={SHIRT}
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d={`M ${arm.elbow.x} ${arm.elbow.y} L ${arm.hand.x} ${arm.hand.y}`}
              stroke={SKIN}
              strokeWidth="24"
              strokeLinecap="round"
            />
            <g transform={`translate(${arm.hand.x} ${arm.hand.y})`}>
              <Hand shape={shape} angle={wristAngle(arm.elbow, arm.hand)} mirror={mirror} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}
