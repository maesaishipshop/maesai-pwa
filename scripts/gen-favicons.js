// Generate favicon/PWA icons from the cart emoji (🛒) on brand-color background
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BRAND_COLOR = '#2D9B6E';

function svgFor(size) {
  const radius = Math.round(size * 0.195); // ~100/512
  const fontSize = Math.round(size * 0.625); // ~320/512
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND_COLOR}"/>
  <text x="50%" y="56%" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" fill="white">\u{1F6D2}</text>
</svg>`;
}

async function renderPng(size) {
  return sharp(Buffer.from(svgFor(size))).png().toBuffer();
}

// Minimal ICO container packing PNG-compressed images (supported by all modern browsers/OS)
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    offset += buffer.length;
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.buffer)]);
}

(async () => {
  // PWA / apple-touch icons
  for (const size of [192, 512]) {
    const buf = await renderPng(size);
    fs.writeFileSync(path.join(PUBLIC_DIR, `logo${size}.png`), buf);
    console.log(`logo${size}.png written`);
  }

  // favicon.ico (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const icoBuffers = [];
  for (const size of icoSizes) {
    const buffer = await renderPng(size);
    icoBuffers.push({ size, buffer });
  }
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), buildIco(icoBuffers));
  console.log('favicon.ico written');
})();
