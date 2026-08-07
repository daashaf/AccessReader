export type DocumentInput =
  | {
      type: 'image'
      data: string
      mediaType: string
    }
  | {
      type: 'pdf'
      data: string
      mediaType: 'application/pdf'
    }
  | {
      type: 'text'
      text: string
    }
