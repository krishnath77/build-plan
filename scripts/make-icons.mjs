// Generates the Build Plan app icons: an original layered-ground block (wavy grass cap, flat soil layers, gold "BP") on a night-stone square.
// Pure Node, no dependencies. Run: npm run icons. Writes PNGs (192, 512, 180) and favicon.svg into public/.
import fs from 'node:fs';
import zlib from 'node:zlib';

const G = 40;                                   // logical grid: 40 x 40 cells
const STONE = [0x23, 0x26, 0x2E];
const GRASS = [0x5D, 0xA1, 0x30], GRASS_LT = [0x8F, 0xD0, 0x5A], GRASS_DK = [0x3F, 0x7A, 0x1F];
const DIRT_A = [0x8B, 0x5A, 0x2B], DIRT_B = [0x7A, 0x4C, 0x22], DIRT_LT = [0xB0, 0x80, 0x52], DIRT_DK = [0x4F, 0x32, 0x16];
const PEBBLE = [0xC9, 0xB8, 0x98];
const GOLD = [0xF2, 0xC2, 0x30], SHADOW = [0x3A, 0x24, 0x10];
const B = ['11110', '10001', '10001', '11110', '10001', '10001', '11110'];
const P = ['11110', '10001', '10001', '11110', '10000', '10000', '10000'];

// An original layered-ground block: a wavy grass cap, flat soil layers, a few pebbles and gold lettering (no speckle texture).
const X0 = 5, X1 = 34, Y0 = 5, Y1 = 34;         // the block, inclusive cell bounds
const WAVE = [0, 0, 1, 2, 2, 1];                 // extra grass depth per column, repeating every 6 columns
const GRASS_ROWS = 6;
const PEBBLES = [[9, 28], [27, 26], [16, 32], [30, 31]];   // 2 x 2 cells

function letter(cx, cy, ox, oy, glyph){
  const gx = cx - ox, gy = cy - oy;
  return gx >= 0 && gx < 10 && gy >= 0 && gy < 14 && glyph[Math.floor(gy / 2)][Math.floor(gx / 2)] === '1';
}
const isLetter = (cx, cy) => letter(cx, cy, 9, 18, B) || letter(cx, cy, 21, 18, P);

function cell(cx, cy){
  if (isLetter(cx, cy)) return GOLD;
  if (isLetter(cx - 1, cy - 1)) return SHADOW;
  if (cx < X0 || cx > X1 || cy < Y0 || cy > Y1) return STONE;
  const depth = GRASS_ROWS + WAVE[(cx - X0) % 6];
  const top = cy - Y0 < depth;
  if (cy === Y0 || cx === X0) return top ? GRASS_LT : DIRT_LT;
  if (cy === Y1 || cx === X1) return top ? GRASS_DK : DIRT_DK;
  if (top) return cy - Y0 === depth - 1 ? GRASS_DK : GRASS;
  if (PEBBLES.some(([px, py]) => cx >= px && cx < px + 2 && cy >= py && cy < py + 2)) return PEBBLE;
  return Math.floor((cy - Y0 - GRASS_ROWS) / 4) % 2 === 0 ? DIRT_A : DIRT_B;
}

const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(N){
  const raw = Buffer.alloc((N * 3 + 1) * N);
  for (let y = 0; y < N; y++) {
    raw[y * (N * 3 + 1)] = 0;
    for (let x = 0; x < N; x++) {
      const c = cell(Math.min(G - 1, Math.floor(x * G / N)), Math.min(G - 1, Math.floor(y * G / N)));
      const i = y * (N * 3 + 1) + 1 + x * 3;
      raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function svg(){
  const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  let out = '';
  for (let y = 0; y < G; y++) {
    let x = 0;
    while (x < G) {
      const c = cell(x, y); let w = 1;
      while (x + w < G && hex(cell(x + w, y)) === hex(c)) w++;
      if (hex(c) !== hex(STONE)) out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${hex(c)}"/>`;
      x += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G} ${G}" shape-rendering="crispEdges"><rect width="${G}" height="${G}" fill="${hex(STONE)}"/>${out}</svg>\n`;
}

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/icon-192.png', png(192));
fs.writeFileSync('public/icon-512.png', png(512));
fs.writeFileSync('public/apple-touch-icon.png', png(180));
fs.writeFileSync('public/favicon.svg', svg());
console.log('icons written');
