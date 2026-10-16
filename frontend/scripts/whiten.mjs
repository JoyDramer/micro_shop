import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'public/images')

// Convert a photo on a white background into a pure-white silhouette
// with soft transparent edges (alpha driven by how dark the source pixel is).
async function whiten(inFile, outFile, { boost = 1.25, floor = 12 } = {}) {
  const src = path.join(ROOT, inFile)
  const out = path.join(ROOT, outFile)
  const img = sharp(src).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const px = Buffer.from(data)

  for (let i = 0; i < px.length; i += channels) {
    const r = px[i]
    const g = px[i + 1]
    const b = px[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    // Darker source pixel => more opaque white result.
    let a = (255 - lum) * boost
    if (a < floor) a = 0
    if (a > 255) a = 255
    px[i] = 255
    px[i + 1] = 255
    px[i + 2] = 255
    px[i + 3] = Math.round(a)
  }

  await sharp(px, { raw: { width, height, channels } })
    .png()
    .toFile(out)
  console.log('wrote', outFile)
}

// Clean no-shadow studio shots -> higher floor removes any faint grey haze.
await whiten('hero-ear-left.png', 'earpiece-left-white.png', { boost: 1.35, floor: 55 })
await whiten('hero-ear-right.png', 'earpiece-right-white.png', { boost: 1.35, floor: 55 })
// Logo: keep it crisp, less feathering.
await whiten('logo.png', 'logo-white.png', { boost: 1.6, floor: 24 })
