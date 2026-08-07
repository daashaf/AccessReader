export type DocumentInput =
  | {
      type: 'image'
      data: string
      mediaType: string
    }
  | {
      type: 'text'
      text: string
    }
