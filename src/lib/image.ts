export interface ImageData {
  data: string
  mediaType: string
  dataUrl: string
}

export function fileToBase64(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(dataUrlToBase64(reader.result as string))
    reader.onerror = () => reject(new Error('Could not read that file. Please try again.'))
    reader.readAsDataURL(file)
  })
}

export function dataUrlToBase64(dataUrl: string): ImageData {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!match) throw new Error('Could not read that file. Please try again.')
  const [, mediaType, data] = match
  return { data, mediaType, dataUrl }
}
