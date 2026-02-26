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

  const resized = await sharp(svgBuffer)
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

  // adaptive-icon.png — keep logo well inside safe zone (≈52% to avoid squircle clipping)
  await generate('adaptive-icon.png', 1024, 0.52);

  // splash-icon.png — 1024px canvas, logo at 75% for crisp high-DPI rendering
  await generate('splash-icon.png',   1024, 0.75);

  // favicon
  await generate('favicon.png',         48, 1.0);

  console.log('\nAll assets written to assets/');
})().catch(e => { console.error(e); process.exit(1); });
