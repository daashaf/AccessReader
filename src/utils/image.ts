export function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error("We couldn't read that file. Please try another one."))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The selected file could not be converted to text data.'))
        return
      }

      const match = /^data:(image\/[a-z0-9.+-]+|application\/pdf);base64,([a-z0-9+/]+={0,2})$/i.exec(
        reader.result,
      )
      if (!match) {
        reject(new Error('The selected file is not a valid image or PDF data URL.'))
        return
      }

      resolve({ mediaType: match[1], data: match[2] })
    }

    reader.readAsDataURL(file)
  })
}
