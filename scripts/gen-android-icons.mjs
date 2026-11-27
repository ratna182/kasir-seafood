import sharp from 'sharp'

const src = 'public/logo-app.webp'
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }

for (const [density, size] of Object.entries(sizes)) {
  const dir = `android/app/src/main/res/mipmap-${density}`
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
  const logo = await sharp(src)
    .ensureAlpha()
    .resize(size, size, { fit: 'contain', background: transparent })
    .png()
    .toBuffer()

  await sharp(logo).toFile(`${dir}/ic_launcher.png`)

  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  )
  await sharp(logo)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(`${dir}/ic_launcher_round.png`)

  const foregroundSize = Math.round(size * 2.25)
  const foreground = await sharp(src)
    .ensureAlpha()
    .resize(Math.round(foregroundSize * 0.8), Math.round(foregroundSize * 0.8), {
      fit: 'contain',
      background: transparent,
    })
    .png()
    .toBuffer()

  await sharp({
    create: { width: foregroundSize, height: foregroundSize, channels: 4, background: transparent },
  })
    .composite([{ input: foreground, gravity: 'centre' }])
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`)

  console.log(`${density}: ${size}px`)
}
