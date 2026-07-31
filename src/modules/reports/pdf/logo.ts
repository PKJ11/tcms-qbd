import fs   from 'fs'
import path from 'path'

let cachedLogoDataUri: string | null = null

export function getLogoDataUri(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri

  const filePath = path.join(process.cwd(), 'public', 'branding', 'qbd-logo.jpg')
  const buffer   = fs.readFileSync(filePath)
  cachedLogoDataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`
  return cachedLogoDataUri
}
