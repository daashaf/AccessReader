export function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error("We couldn't read that image. Please try another one."))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The selected image could not be converted to text data.'))
        return
      }

      const match = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(reader.result)
      if (!match) {
        reject(new Error('The selected file is not a valid image data URL.'))
        return
      }

      resolve({ mediaType: match[1], data: match[2] })
    }

    reader.readAsDataURL(file)
  })
}
