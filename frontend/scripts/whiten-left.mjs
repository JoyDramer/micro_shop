import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'public/images')

// Remove a (near-)white background from a white product via flood-fill from the
// image borders, then recolor every surviving product pixel to pure white with
// soft anti-aliased edges. Works for white-on-white shots where a luminance
// silhouette would erase the product itself.
async function run() {
  const src = path.join(ROOT, 'hero-ear-left-src.jpg')
  const out = path.join(ROOT, 'earpiece-left-white.png')

  const img = sharp(src).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const px = Buffer.from(data)

  const isBgLike = (idx) => {
    const r = px[idx]
    const g = px[idx + 1]
    const b = px[idx + 2]
    // treat light, low-saturation pixels as background
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    return max > 218 && max - min < 24
  }

  const N = width * height
  const bg = new Uint8Array(N) // 1 = background
  const stack = []

  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const p = y * width + x
    if (bg[p]) return
    if (isBgLike(p * channels)) {
      bg[p] = 1
      stack.push(p)
    }
  }

  for (let x = 0; x < width; x++) {
    pushIf(x, 0)
    pushIf(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    pushIf(0, y)
    pushIf(width - 1, y)
  }

  while (stack.length) {
    const p = stack.pop()
    const x = p % width
    const y = (p - x) / width
    pushIf(x + 1, y)
    pushIf(x - 1, y)
    pushIf(x, y + 1)
    pushIf(x, y - 1)
  }

  // Recolor product pixels to white; background transparent.
  for (let p = 0; p < N; p++) {
    const i = p * channels
    px[i] = 255
    px[i + 1] = 255
    px[i + 2] = 255
    px[i + 3] = bg[p] ? 0 : 255
  }

  await sharp(px, { raw: { width, height, channels } })
    // slight blur+threshold on alpha via median smoothing to soften jaggies
    .png()
    .toFile(out)
  console.log('wrote earpiece-left-white.png', width, height)
}

run()
