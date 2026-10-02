import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = fs.readFileSync(path.resolve('./public/icon.svg'));

async function generate() {
  // 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('./public/pwa-192x192.png'));

  // 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('./public/pwa-512x512.png'));

  // Apple Touch Icon 180x180 PNG
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('./public/apple-touch-icon.png'));

  // Maskable 512x512 with safe margin (10-15%)
  const innerIcon = await sharp(svgBuffer)
    .resize(410, 410)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 }
    }
  })
    .composite([{ input: innerIcon, gravity: 'center' }])
    .png()
    .toFile(path.resolve('./public/pwa-maskable-512x512.png'));

  // Favicon 48x48
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.resolve('./public/favicon.ico'));

  console.log('PWA icons successfully generated!');
}

generate().catch(console.error);
