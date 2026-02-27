/**
 * Generates all required app icon / splash assets from assets/Logo.svg
 *
 *  icon.png          1024×1024  — app launcher icon (flat, no padding)
 *  adaptive-icon.png 1024×1024  — Android adaptive foreground (logo at 66%, padded)
 *  splash-icon.png    512×512   — Expo splash (logo at 70%, padded)
 *  favicon.png         48×48    — web favicon
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH    = path.join(__dirname, '../assets/Logo.svg');
const ASSETS_DIR  = path.join(__dirname, '../assets');

const svgBuffer = fs.readFileSync(SVG_PATH);

async function generate(outputName, canvasSize, logoScale) {
  const logoSize = Math.round(canvasSize * logoScale);
  const offset   = Math.round((canvasSize - logoSize) / 2);

  // Render SVG at high resolution first, then trim transparent whitespace,
  // then resize to target — this removes Illustrator's empty viewBox padding
  const trimmed = await sharp(svgBuffer)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
    .then(buf => sharp(buf).trim({ threshold: 1 }).toBuffer());

  const resized = await sharp(trimmed)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width:      canvasSize,
      height:     canvasSize,
      channels:   4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left: offset, top: offset }])
    .png()
    .toFile(path.join(ASSETS_DIR, outputName));

  console.log(`✓ ${outputName}  (${canvasSize}×${canvasSize}, logo ${Math.round(logoScale * 100)}%)`);
}

(async () => {
  // icon.png — full bleed is fine for the square launcher icon
  await generate('icon.png',          1024, 1.0);

  // adaptive-icon.png — 70% of canvas after trim = good fill inside squircle safe zone
  await generate('adaptive-icon.png', 1024, 0.70);

  // splash-icon.png — 90%: fills the Android 12 288dp icon box as much as possible
  await generate('splash-icon.png',   1024, 0.90);

  // favicon
  await generate('favicon.png',         48, 1.0);

  console.log('\nAll assets written to assets/');
})().catch(e => { console.error(e); process.exit(1); });
