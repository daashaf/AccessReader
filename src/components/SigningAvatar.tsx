import { useEffect, useMemo, useRef, useState } from 'react'
import type { Gloss, NonManual } from '../data/document'

/**
 * A signing avatar drawn head-to-waist against a flat stage.
 *
 * Framing rule from the scope doc: the face is never cropped and the space above
 * the head stays clear so hands can move into it. The viewBox below reserves the
 * top ~100 units for exactly that.
 *
 * Motion is generated, not recorded: each gloss token seeds a deterministic pair
 * of hand targets, and arms are solved with two-bone IK so the same sign always
 * produces the same handshape and location. Non-manual markers drive the brows,
 * mouth and head, because in NZSL that is where the grammar lives.
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

interface Vec {
  x: number
  y: number
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

interface Pose {
  right: Vec // signer's right hand (viewer left)
  left: Vec
  /** 0 = flat/relaxed hand, 1 = pointing, 2 = closed */
  rightShape: number
  leftShape: number
  /** Slight torso/head lean, in degrees. */
  lean: number
}

const REST: Pose = {
  right: { x: 168, y: 400 },
  left: { x: 252, y: 400 },
  rightShape: 0,
  leftShape: 0,
  lean: 0,
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

  const right = {
    x: 176 - next() * 74 * spread,
    y: 118 + next() * (numeric ? 130 : 210),
  }
  const left = twoHanded
    ? { x: 244 + next() * 74 * spread, y: right.y + (next() - 0.5) * 54 }
    : { x: 256 + next() * 12, y: 372 + next() * 26 }

  return {
    right,
    left,
    rightShape: fingerspelled ? 1 : Math.floor(next() * 3),
    leftShape: twoHanded ? (fingerspelled ? 1 : Math.floor(next() * 3)) : 0,
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
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
    if (!playing) {
      // Settle to rest rather than freezing mid-sign.
      setPose((current) => ({ ...current }))
      return
    }
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
        rightShape: t < 0.5 ? a.rightShape : b.rightShape,
        leftShape: t < 0.5 ? a.leftShape : b.leftShape,
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

  // Non-manual features. These are grammar: brow raise marks a yes/no question,
  // furrow marks wh-, headshake marks negation, raised brows plus a head tilt
  // mark the topic.
  const browLift = nmm === 'brow-raise' || nmm === 'topic' ? -9 : 0
  const browFurrow = nmm === 'brow-furrow' ? 6 : 0
  const headTilt = nmm === 'topic' ? -3 : 0
  const shaking = playing && nmm === 'headshake'
  const mouthOpen = nmm === 'brow-raise' ? 7 : nmm === 'headshake' ? 3 : 5

  const skin = '#E8C9AE'
  const skinShade = '#D9B295'
  const shirt = '#1F2A33'

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
            fill={shirt}
          />
          {/* Collar */}
          <path d="M 186 243 Q 210 268 234 243 L 228 238 Q 210 252 192 238 Z" fill="#2C3946" />

          {/* Neck */}
          <path d="M 190 210 h 40 v 34 q -20 14 -40 0 Z" fill={skinShade} />

          {/* Head */}
          <g
            transform={`rotate(${headTilt} ${HEAD.x} 210)`}
            style={
              shaking
                ? { animation: `nzsl-headshake ${0.62 / speed}s ease-in-out infinite` }
                : undefined
            }
            // The rotation origin sits at the neck so the shake reads as negation.
            transform-origin={`${HEAD.x}px 215px`}
          >
            <ellipse cx={HEAD.x} cy={HEAD.y} rx={HEAD.rx} ry={HEAD.ry} fill={skin} />
            {/* Ears */}
            <ellipse cx={HEAD.x - HEAD.rx} cy={HEAD.y + 8} rx="8" ry="13" fill={skinShade} />
            <ellipse cx={HEAD.x + HEAD.rx} cy={HEAD.y + 8} rx="8" ry="13" fill={skinShade} />
            {/* Hair — kept simple and matte so nothing competes with the face */}
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

            {/* Eyes — kept large and high-contrast; gaze stays on the reader. */}
            <ellipse cx={HEAD.x - 20} cy={HEAD.y + 2} rx="9" ry="6.5" fill="#FFFFFF" />
            <ellipse cx={HEAD.x + 20} cy={HEAD.y + 2} rx="9" ry="6.5" fill="#FFFFFF" />
            <circle cx={HEAD.x - 20} cy={HEAD.y + 2} r="4" fill="#1A1A1A" />
            <circle cx={HEAD.x + 20} cy={HEAD.y + 2} r="4" fill="#1A1A1A" />

            {/* Nose */}
            <path
              d={`M ${HEAD.x} ${HEAD.y + 6} q 5 14 -4 18`}
              stroke={skinShade}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Mouth patterns accompany the manual sign. */}
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
          { arm: armR, shoulder: SHOULDER_L, shape: pose.rightShape },
          { arm: armL, shoulder: SHOULDER_R, shape: pose.leftShape },
        ].map(({ arm, shoulder, shape }, i) => (
          <g key={i}>
            <path
              d={`M ${shoulder.x} ${shoulder.y} L ${arm.elbow.x} ${arm.elbow.y}`}
              stroke={shirt}
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d={`M ${arm.elbow.x} ${arm.elbow.y} L ${arm.hand.x} ${arm.hand.y}`}
              stroke={skin}
              strokeWidth="26"
              strokeLinecap="round"
            />
            {/* Hand. Shape index stands in for handshape; fingers are indicated
                rather than fully articulated, which is honest for a prototype. */}
            <g transform={`translate(${arm.hand.x} ${arm.hand.y})`}>
              <circle r={shape === 2 ? 15 : 17} fill={skin} />
              {shape === 1 && (
                <path
                  d={`M 0 0 L ${i === 0 ? -20 : 20} -14`}
                  stroke={skin}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              )}
              {shape === 0 && (
                <>
                  <path
                    d={`M -2 -4 L ${i === 0 ? -16 : 16} -18`}
                    stroke={skin}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M 2 -2 L ${i === 0 ? -8 : 8} -22`}
                    stroke={skin}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </>
              )}
              <circle r={shape === 2 ? 15 : 17} fill="none" stroke={skinShade} strokeWidth="2" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}
