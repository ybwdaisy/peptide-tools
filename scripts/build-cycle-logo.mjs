// Reproduce the approved cycle mark from its stored reference, then emit vector assets.
// Run: node scripts/build-cycle-logo.mjs
// Sharp is Astro's existing image renderer; there is no added dependency.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const source = new URL('../qa/design-target/logo-cycle.png', import.meta.url);
const out = new URL('../public/brand/', import.meta.url);
await mkdir(out, { recursive: true });
const { data, info } = await sharp(await readFile(source)).extract({ left: 110, top: 210, width: 340, height: 330 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const mask = (x, y) => {
  if (x < 0 || y < 0 || x >= info.width || y >= info.height) return false;
  const i = (y * info.width + x) * info.channels;
  return data[i] < 110 && data[i + 1] < 160 && data[i + 2] < 190;
};
const edges = new Map();
const key = (p) => p.join(',');
const add = (a, b) => edges.set(key(a), b);
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (mask(x, y)) {
  if (!mask(x, y - 1)) add([x, y], [x + 1, y]);
  if (!mask(x + 1, y)) add([x + 1, y], [x + 1, y + 1]);
  if (!mask(x, y + 1)) add([x + 1, y + 1], [x, y + 1]);
  if (!mask(x - 1, y)) add([x, y + 1], [x, y]);
}
const contours = [];
while (edges.size) {
  const start = edges.keys().next().value;
  let at = start;
  const points = [];
  do {
    const next = edges.get(at);
    if (!next) throw new Error('The approved mark contains an ambiguous contour.');
    points.push(at.split(',').map(Number)); edges.delete(at); at = key(next);
  } while (at !== start);
  if (points.length > 100) contours.push(points);
}
if (contours.length !== 3) throw new Error(`Expected the approved three segments, found ${contours.length}.`);
const all = contours.flat();
const left = Math.min(...all.map(p => p[0])), right = Math.max(...all.map(p => p[0]));
const top = Math.min(...all.map(p => p[1])), bottom = Math.max(...all.map(p => p[1]));
const scale = 304 / Math.max(right - left, bottom - top);
const normalize = ([x, y]) => [+(160 + (x - (left + right) / 2) * scale).toFixed(2), +(160 + (y - (top + bottom) / 2) * scale).toFixed(2)];
function simplify(points, epsilon = 1.4) {
  if (points.length < 3) return points;
  const a = points[0], b = points.at(-1), dx = b[0] - a[0], dy = b[1] - a[1];
  let max = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (distance > max) { max = distance; index = i; }
  }
  return max > epsilon ? [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)] : [a, b];
}
function path(points) {
  const half = Math.floor(points.length / 2);
  const reduced = [...simplify(points.slice(0, half + 1)).slice(0, -1), ...simplify([...points.slice(half), points[0]]).slice(0, -1)].map(normalize);
  const mid = (a, b) => a.map((value, i) => +((value + b[i]) / 2).toFixed(2));
  return `M${mid(reduced.at(-1), reduced[0])} ` + reduced.map((p, i) => `Q${p} ${mid(p, reduced[(i + 1) % reduced.length])}`).join(' ') + ' Z';
}
const paths = contours.map(path);
const geometry = paths.map(d => `<path d="${d}"/>`).join('');
const mark = fill => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="${fill}">${geometry}</svg>\n`;
await writeFile(new URL('mark.svg', out), mark('#205b7a'));
await writeFile(new URL('mark-inverse.svg', out), mark('#ffffff'));
const font = await readFile(new URL('../public/fonts/schibsted-grotesk-latin.woff2', import.meta.url));
const license = await readFile(new URL('../public/fonts/schibsted-grotesk-LICENSE.txt', import.meta.url), 'utf8');
await writeFile(new URL('FONT-LICENSE.txt', out), license);
const metadata = license.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const [name, ink] of [['logo', '#10283d'], ['logo-inverse', '#ffffff']]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 80" role="img" aria-label="PeptideTools"><title>PeptideTools</title><metadata>${metadata}</metadata><defs><style>@font-face{font-family:PeptideWordmark;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:400 900}</style></defs><g fill="${name === 'logo' ? '#205b7a' : ink}" transform="translate(4 4) scale(.225)">${geometry}</g><text x="94" y="55" fill="${ink}" font-family="PeptideWordmark,sans-serif" font-size="46" font-weight="700" letter-spacing="-1">PeptideTools</text></svg>\n`;
  await writeFile(new URL(`${name}.svg`, out), svg);
}
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#10283d"/><g transform="translate(9 9) scale(.14375)" fill="#ffffff">${geometry}</g></svg>\n`;
await writeFile(new URL('../public/favicon.svg', import.meta.url), favicon);
console.log('Approved three-segment cycle: generated standalone/reverse marks, self-contained vector wordmarks and favicon source.');
