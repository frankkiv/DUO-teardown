// The geometry, built from code in millimetres. Each half is a group: the right half (B) is fixed, the left half (A)
// hangs off a pivot on the spine's front edge and is mirrored, so every part is written once in "outward = +x" form.
// update(e, openDeg) poses everything from the two inputs through kin.js.
import * as THREE from 'three';
import {BODY, PARTS} from './specs.js';
import {envelope, foldPhi, HINGE_R, hingeD, partProgress, PIVOT_Z} from './kin.js';

const {w: W, h: H, t: T} = BODY;
// glass sits inside the frame ring (the ring's wall is 1.3 mm), never on top of it: coplanar faces flicker
const GLASS_IN = 1.35;
const LIFT = 0.06; // a printed face (screen, label) stands this far off the body under it
const FLEX = 7;
const PLAT = {x0: 5, y0: 88, x1: W - 5, y1: H - 5, h: 1.8}; // camera plateau on the back of the right half (placement: estimate) // mm each side of the spine where the folding panel and the graphite bridge are free to bend

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ------------------------------------------------------------------ shapes
function rrect(x0, y0, x1, y1, r) {
  // r: [bottom-left, bottom-right, top-right, top-left] or a number
  const [bl, br, tr, tl] = Array.isArray(r) ? r : [r, r, r, r];
  const s = new THREE.Shape();
  s.moveTo(x0 + bl, y0);
  s.lineTo(x1 - br, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + br);
  s.lineTo(x1, y1 - tr);
  s.quadraticCurveTo(x1, y1, x1 - tr, y1);
  s.lineTo(x0 + tl, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - tl);
  s.lineTo(x0, y0 + bl);
  s.quadraticCurveTo(x0, y0, x0 + bl, y0);
  return s;
}
// the outline of one half: square-ish at the spine (x = 0), round at the outer edge
const halfR = (inset) => [Math.max(0.6, 1.2 - inset), Math.max(1, BODY.r - inset), Math.max(1, BODY.r - inset), Math.max(0.6, 1.2 - inset)];
const halfShape = (inset) => rrect(inset, inset, W - inset, H - inset, halfR(inset));

function extrude(shape, z0, z1, segs = 10) {
  const g = new THREE.ExtrudeGeometry(shape, {depth: z1 - z0, bevelEnabled: false, curveSegments: segs});
  g.translate(0, 0, z0);
  return g;
}
const slab = (x0, y0, x1, y1, z0, z1, r = 1) => extrude(rrect(x0, y0, x1, y1, r), z0, z1);
function cylZ(r, z0, z1, x, y, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, (z0 + z1) / 2);
  return g;
}
// A flat face (screen, label) at height z, facing +z or -z, with uv from a function of the final position.
function face(shape, z, back, uvf) {
  const g = new THREE.ShapeGeometry(shape, 12);
  if (back) {
    g.scale(-1, 1, 1);
    g.rotateY(Math.PI);
  }
  g.translate(0, 0, z);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const [u, v] = uvf(p.getX(i), p.getY(i));
    uv.setXY(i, u, v);
  }
  return g;
}

// ------------------------------------------------------------------ textures
function canvasTex(wpx, hpx, draw) {
  const c = document.createElement('canvas');
  c.width = wpx;
  c.height = hpx;
  draw(c.getContext('2d'), wpx, hpx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const FONT = "'Inter','Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

function wallpaper(ctx, w, h, inner) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1b2a4a');
  g.addColorStop(0.55, '#3f5e8c');
  g.addColorStop(1, '#e8a27a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // soft blobs
  for (const [x, y, r, c] of [[0.2, 0.75, 0.5, 'rgba(255,170,120,.35)'], [0.8, 0.25, 0.45, 'rgba(120,170,255,.3)']]) {
    const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
    rg.addColorStop(0, c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.textAlign = 'center';
  if (inner) {
    // a widget column on the left page, an icon grid on the right page
    ctx.font = `600 ${h * 0.09}px ${FONT}`;
    ctx.fillText('9:41', w * 0.25, h * 0.2);
    ctx.font = `500 ${h * 0.025}px ${FONT}`;
    ctx.fillText('11 月 11 日 星期三', w * 0.25, h * 0.25);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.roundRect(w * 0.07, h * (0.33 + i * 0.25), w * 0.36, h * 0.21, 26);
      ctx.fill();
    }
    const cols = ['#ff9f43', '#2ed573', '#1e90ff', '#ff6b81', '#eccc68', '#a29bfe', '#70a1ff', '#7bed9f'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
      ctx.fillStyle = cols[(r * 4 + c) % cols.length];
      ctx.beginPath();
      ctx.roundRect(w * (0.565 + c * 0.105), h * (0.1 + r * 0.16), w * 0.06, w * 0.06, 14);
      ctx.fill();
    }
    // the dock
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath();
    ctx.roundRect(w * 0.3, h * 0.885, w * 0.4, h * 0.085, 30);
    ctx.fill();
  } else {
    ctx.font = `600 ${h * 0.11}px ${FONT}`;
    ctx.fillText('9:41', w * 0.5, h * 0.22);
    ctx.font = `500 ${h * 0.03}px ${FONT}`;
    ctx.fillText('11 月 11 日 星期三', w * 0.5, h * 0.28);
  }
}

function batteryLabel(p) {
  return canvasTex(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#26272b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a4b52';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#e9e9ea';
    ctx.textAlign = 'center';
    ctx.font = `700 60px ${FONT}`;
    ctx.fillText('Li-ion', w / 2, h * 0.32);
    ctx.font = `700 80px ${FONT}`;
    ctx.fillText(`${p.wh.toFixed(1)} Wh`, w / 2, h * 0.47);
    ctx.font = `500 40px ${FONT}`;
    ctx.fillText(`${p.mah.toLocaleString()} mAh`, w / 2, h * 0.58);
    ctx.fillStyle = '#e8562a';
    ctx.fillRect(w * 0.3, h * 0.68, w * 0.4, 8);
    ctx.fillStyle = '#9a9ba1';
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(p.half === 'B' ? 'CELL 1 OF 2' : 'CELL 2 OF 2', w / 2, h * 0.78);
  });
}

// ------------------------------------------------------------------ materials
const M = {
  backGlass: () => new THREE.MeshPhysicalMaterial({color: '#27314a', roughness: 0.42, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.5}),
  plateau: () => new THREE.MeshPhysicalMaterial({color: '#2f3a57', roughness: 0.2, clearcoat: 1}),
  carbon: () => new THREE.MeshStandardMaterial({color: '#17181b', roughness: 0.35, metalness: 0.5}),
  magnet: () => new THREE.MeshStandardMaterial({color: '#55585e', roughness: 0.4, metalness: 0.8}),
  flex: () => new THREE.MeshStandardMaterial({color: '#c98a3a', roughness: 0.5, metalness: 0.5}),
  titanium: () => new THREE.MeshStandardMaterial({color: '#8f95a3', metalness: 0.9, roughness: 0.3, envMapIntensity: 0.7}),
  steel: () => new THREE.MeshStandardMaterial({color: '#a5a8ad', metalness: 0.9, roughness: 0.38, envMapIntensity: 0.6}),
  alu: () => new THREE.MeshStandardMaterial({color: '#c9cbce', metalness: 0.7, roughness: 0.5, envMapIntensity: 0.5}),
  dark: () => new THREE.MeshStandardMaterial({color: '#1d1e21', metalness: 0.2, roughness: 0.55}),
  glassBlack: () => new THREE.MeshPhysicalMaterial({color: '#08090b', roughness: 0.08, clearcoat: 1, metalness: 0.1}),
  pcb: () => new THREE.MeshStandardMaterial({color: '#1f4733', roughness: 0.6, metalness: 0.1}),
  chip: () => new THREE.MeshStandardMaterial({color: '#141518', roughness: 0.4, metalness: 0.3}),
  lid: () => new THREE.MeshStandardMaterial({color: '#cfd1d4', roughness: 0.35, metalness: 0.9}),
  copper: () => new THREE.MeshStandardMaterial({color: '#c27a4a', roughness: 0.4, metalness: 0.9, envMapIntensity: 0.6}),
  pouch: () => new THREE.MeshStandardMaterial({color: '#2e2f33', roughness: 0.5, metalness: 0.3}),
  plastic: () => new THREE.MeshStandardMaterial({color: '#e7e2d8', roughness: 0.6}),
  gold: () => new THREE.MeshStandardMaterial({color: '#d4a94f', roughness: 0.35, metalness: 0.9}),
  grille: () => new THREE.MeshStandardMaterial({color: '#3a3b40', roughness: 0.7, metalness: 0.5}),
  screen: (map) => new THREE.MeshStandardMaterial({color: '#000000', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0, side: THREE.DoubleSide}),
  pouchLabel: (map) => new THREE.MeshStandardMaterial({map, roughness: 0.5, side: THREE.DoubleSide}),
};

// ------------------------------------------------------------------ part builders (outward = +x, z from back 0 to front T)
// each returns [[geometry, material], ...]; `side` is 'A' or 'B' for textures that must read the right way round.
const BUILD = {
  glass: (p) => [
    [extrude(halfShape(GLASS_IN), p.z0, p.z1, 14), M.backGlass()],
    // the camera plateau runs across the top of the back; the lenses stand through it
    [slab(PLAT.x0, PLAT.y0, PLAT.x1, PLAT.y1, -PLAT.h, 0, 9), M.plateau()],
    [cylZ(2.3, -PLAT.h - 0.15, -PLAT.h + 0.1, 30, (PLAT.y0 + PLAT.y1) / 2), M.plastic()],
    [cylZ(0.8, -PLAT.h - 0.1, -PLAT.h + 0.1, 20, (PLAT.y0 + PLAT.y1) / 2), M.glassBlack()],
  ],
  cover: (p, side) => {
    const out = [[extrude(halfShape(GLASS_IN), p.z0, p.z1, 14), M.glassBlack()]];
    const scr = rrect(2.2, 2.2, W - 2.2, H - 2.2, halfR(2.2));
    out.push([face(scr, p.z0 - LIFT, true, (x, y) => [(x - 2.2) / (W - 4.4), (y - 2.2) / (H - 4.4)]), M.screen(TEX.cover)]);
    return out;
  },
  inner: (p, side) => {
    // one folding panel: each half carries its page of it; the wallpaper spans both
    // rigid from FLEX outward; the strip between the two pages bends (buildPhone makes it)
    const shp = rrect(FLEX, GLASS_IN, W - GLASS_IN, H - GLASS_IN, halfR(GLASS_IN));
    const out = [[extrude(shp, p.z0, p.z1 - 0.05, 14), M.glassBlack()]];
    const scr = rrect(FLEX, 2.5, W - 2.5, H - 2.5, [0.01, 8.5, 8.5, 0.01]);
    const u = side === 'B' ? (x) => 0.5 + x / (2 * W) : (x) => 0.5 - x / (2 * W);
    out.push([face(scr, p.z1 + LIFT, false, (x, y) => [u(x), y / H]), M.screen(TEX.inner)]);
    return out;
  },
  coil: (p) => {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const ring = new THREE.Shape();
    ring.absarc(0, 0, 21, 0, Math.PI * 2);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 12, 0, Math.PI * 2, true);
    ring.holes.push(hole);
    const g = extrude(ring, p.z0, p.z1, 48);
    g.translate(cx, cy, 0);
    const mag = new THREE.Shape();
    mag.absarc(0, 0, 25, 0, Math.PI * 2);
    const mh = new THREE.Path();
    mh.absarc(0, 0, 22.5, 0, Math.PI * 2, true);
    mag.holes.push(mh);
    const gm = extrude(mag, p.z0, p.z1, 48);
    gm.translate(cx, cy, 0);
    return [[g, M.copper()], [gm, M.dark()], [slab(cx - 2, cy - 30, cx + 2, cy - 21, p.z0, p.z1 - 0.1, 0.5), M.gold()]];
  },
  camera: (p) => {
    const out = [];
    const x0 = p.x, y0 = p.y, x1 = p.x + p.w, y1 = p.y + p.h, yc = (PLAT.y0 + PLAT.y1) / 2;
    out.push([slab(x0 + 1, y0 + 1, x1 - 1, y1 - 1, 0.7, p.z1, 4), M.dark()]);
    // main and ultra wide, side by side on the plateau
    for (const [lx, r] of [[x0 + 8.5, 6.3], [x0 + 23.5, 6.0]]) {
      out.push([cylZ(r, p.z0 - 1.3, 0.7, lx, yc, 40), M.steel()]);
      out.push([cylZ(r * 0.72, p.z0 - 1.36, p.z0 - 0.8, lx, yc, 40), M.glassBlack()]);
      out.push([cylZ(r * 0.28, p.z0 - 1.4, p.z0 - 1.2, lx, yc, 24), M.lid()]);
    }
    out.push([slab(x0 + 3, y0 - 3, x0 + 9, y0 + 2, 2.2, 2.5, 0.5), M.gold()]);
    return out;
  },
  board: (p) => {
    // one layer; chips face the back. z0 is the PCB's back face.
    const x0 = p.x, y0 = p.y, x1 = p.x + p.w, y1 = p.y + p.h;
    const out = [[slab(x0, y0, x1, y1, p.z0, p.z1, 2), M.pcb()]];
    const chip = (cx, cy, w, h, t, m) => out.push([slab(x0 + cx, y0 + cy, x0 + cx + w, y0 + cy + h, p.z0 - t, p.z0, 0.6), m]);
    chip(4, 12, 15, 15, 0.85, M.lid());      // A20 Pro under its shield
    chip(5.5, 13.5, 12, 12, 0.9, M.chip());
    chip(22, 15, 10, 11, 0.8, M.chip());     // C2 modem
    chip(22, 3, 8, 8, 0.7, M.chip());        // N1 wireless
    chip(4, 2, 12, 7, 0.75, M.chip());       // NAND
    chip(33, 4, 4.5, 9, 0.6, M.lid());       // PMIC shield
    for (let i = 0; i < 30; i++) {
      const cx = 1.5 + rnd() * (p.w - 5), cy = 1.5 + rnd() * (p.h - 4);
      if ((cx > 2.5 && cx < 33.5 && cy > 1 && cy < 28.5 && !(cx > 19.5 && cx < 21.5)) || cx > 32) continue;
      chip(cx, cy, 0.8 + rnd() * 1.4, 0.6 + rnd() * 1.2, 0.4, rnd() > 0.5 ? M.chip() : M.lid());
    }
    for (const [cx, cy] of [[34, 16], [34, 23], [1, 22]]) chip(cx, cy, 3.5, 5, 0.5, M.gold()); // board-to-board connectors
    return out;
  },
  ioboard: (p) => {
    const x0 = p.x, y0 = p.y, x1 = p.x + p.w, y1 = p.y + p.h;
    const out = [[slab(x0, y0, x1, y1, p.z0, p.z1, 1.5), M.pcb()]];
    for (const [cy, h, m] of [[4, 9, M.chip()], [18, 6, M.lid()], [30, 8, M.chip()], [44, 5, M.gold()], [52, 4, M.gold()]]) out.push([slab(x0 + 4, y0 + cy, x1 - 4, y0 + cy + h, p.z0 - 0.6, p.z0, 0.5), m]);
    return out;
  },
  udc: (p) => [[slab(p.x, p.y, p.x + p.w, p.y + p.h, p.z0, p.z1 - 0.3, 1.5), M.dark()], [cylZ(2.6, p.z1 - 0.3, p.z1, p.x + p.w / 2, p.y + p.h / 2), M.steel()], [cylZ(1.7, p.z1 - 0.1, p.z1 + 0.04, p.x + p.w / 2, p.y + p.h / 2), M.glassBlack()]],
  button: (p) => {
    const out = [[slab(p.x, p.y, p.x + p.w, p.y + p.h, p.z0, p.z1, Math.min(p.w, p.h) * 0.45), p.flush ? M.glassBlack() : M.titanium()]];
    // the switch and flex behind the rail
    if (p.rail === 'side') out.push([slab(p.x - 3.2, p.y + 1, p.x - 1.4, p.y + p.h - 1, p.z0 + 0.3, p.z1 - 0.3, 0.4), M.dark()]);
    else out.push([slab(p.x + 1, p.y - 3.2, p.x + p.w - 1, p.y - 1.4, p.z0 + 0.3, p.z1 - 0.3, 0.4), M.dark()]);
    if (p.rail === 'top') out.push([slab(p.x + p.w / 2 - 0.4, p.y, p.x + p.w / 2 + 0.4, p.y + p.h + 0.02, p.z0, p.z1, 0.1), M.dark()]); // split: up / down
    return out;
  },
  screws: (p) => {
    const out = [];
    for (const x of [p.x, p.x + 14, p.x + 40, p.x + p.w]) {
      const g = new THREE.CylinderGeometry(0.75, 0.55, 3.6, 12);
      g.translate(x, p.y + 1.8, (p.z0 + p.z1) / 2);
      out.push([g, M.steel()]);
      const hd = new THREE.CylinderGeometry(0.95, 0.95, 0.3, 5);
      hd.translate(x, p.y - 0.1, (p.z0 + p.z1) / 2);
      out.push([hd, M.chip()]);
    }
    return out;
  },
  magnets: (p) => {
    const out = [];
    const n = 6, hh = p.h / n;
    for (let i = 0; i < n; i++) out.push([slab(p.x, p.y + i * hh + 0.4, p.x + p.w, p.y + (i + 1) * hh - 0.4, p.z0, p.z1, 0.3), i % 2 ? M.magnet() : M.lid()]);
    return out;
  },
  flexends: (p) => [[slab(p.x, p.y, p.x + p.w, p.y + p.h, p.z0, p.z1, 0.4), M.flex()], [slab(p.x + p.w - 3.5, p.y - 0.6, p.x + p.w, p.y + p.h + 0.6, p.z0 - 0.5, p.z1 + 0.3, 0.3), M.chip()]],
  plates: (p) => [[slab(p.x, p.y, p.x + p.w, p.y + p.h, p.z0, p.z1, 0.5), M.carbon()]],
  subboard: (p) => {
    const x0 = p.x, y0 = p.y, x1 = p.x + p.w, y1 = p.y + p.h;
    return [
      [slab(x0, y0, x1, y1, p.z1 - 0.8, p.z1, 2), M.pcb()],
      [slab(x0 + 4, y0 + 6, x0 + 14, y0 + 16, p.z1 - 2.2, p.z1 - 0.8, 1), M.dark()],
      [cylZ(1.6, p.z1 - 2.6, p.z1 - 2.2, x0 + 9, y0 + 11), M.glassBlack()],
      [slab(x0 + 20, y0 + 6, x0 + 36, y0 + 14, p.z1 - 1.6, p.z1 - 0.8, 0.8), M.lid()],
    ];
  },
  selfie: (p) => [[cylZ(p.w / 2, p.z0, p.z1, p.x + p.w / 2, p.y + p.h / 2), M.dark()], [cylZ(p.w / 2 - 1.5, p.z0 - 0.1, p.z0 + 0.4, p.x + p.w / 2, p.y + p.h / 2), M.glassBlack()]],
  taptic: (p) => [[slab(p.x, p.y, p.x + p.w, p.y + p.h, p.z0, p.z1, 2), M.steel()], [slab(p.x + 2, p.y + 2, p.x + 8, p.y + p.h - 2, p.z0 - 0.15, p.z0, 1), M.gold()]],
  speaker: (p) => {
    const out = [[slab(p.x, p.y, p.x + p.w, p.y + p.h, p.z0, p.z1, 2), M.dark()]];
    out.push([slab(p.x + 3, p.y + 2.5, p.x + p.w - 3, p.y + p.h - 2.5, p.z0 - 0.15, p.z0, 1.5), M.grille()]);
    return out;
  },
  usbc: (p) => [[slab(p.x, p.y + 1.0, p.x + p.w, p.y + p.h, p.z0, p.z1, 1.2), M.steel()], [slab(p.x + 2, p.y, p.x + p.w - 2, p.y + 1, p.z0 + 0.5, p.z1 - 0.5, 0.6), M.dark()]],
  battery: (p) => {
    const x0 = p.x, y0 = p.y, x1 = p.x + p.w, y1 = p.y + p.h;
    const out = [[slab(x0, y0, x1, y1, p.z0, p.z1, 3), M.pouch()]];
    // the label faces the back, so it reads from behind; on the mirrored left half the u runs the other way
    const lx0 = x0 + 8, lx1 = x1 - 8, ly0 = y0 + 10, ly1 = y1 - 10;
    const u = p.half === 'B' ? (x) => (lx1 - x) / (lx1 - lx0) : (x) => (x - lx0) / (lx1 - lx0);
    out.push([face(rrect(lx0, ly0, lx1, ly1, 2), p.z0 - LIFT, true, (x, y) => [u(x), (y - ly0) / (ly1 - ly0)]), M.pouchLabel(batteryLabel(p))]);
    // pull tabs and the flex to the board
    out.push([slab(x0 + 14, y0 - 6, x0 + 22, y0 + 1, p.z0 + 0.1, p.z0 + 0.3, 1), M.plastic()]);
    out.push([slab(x0 + 40, y0 - 6, x0 + 48, y0 + 1, p.z0 + 0.1, p.z0 + 0.3, 1), M.plastic()]);
    out.push([slab(x0 + 2, y1 - 2, x0 + 8, y1 + 6, p.z0 + 0.4, p.z0 + 0.7, 0.5), M.gold()]);
    return out;
  },
  antenna: (p) => {
    // plastic breaks across the titanium rail plus the flex lines inside it
    const out = [];
    const brk = (x0, y0, x1, y1) => out.push([slab(x0, y0, x1, y1, 0.05, T - 0.05, 0.1), M.plastic()]);
    brk(W - 1.5, 22, W + 0.05, 23.4);
    brk(W - 1.5, H - 23.4, W + 0.05, H - 22);
    brk(W * 0.62, -0.05, W * 0.62 + 1.4, 1.5);
    brk(W * 0.62, H - 1.5, W * 0.62 + 1.4, H + 0.05);
    out.push([slab(W - 2.4, 4, W - 1.8, 20, 2.0, 3.2, 0.2), M.gold()]);
    out.push([slab(W - 2.4, H - 20, W - 1.8, H - 12, 2.0, 3.2, 0.2), M.gold()]);
    out.push([slab(W * 0.3, H - 2.4, W * 0.58, H - 1.8, 2.0, 3.2, 0.2), M.gold()]);
    out.push([slab(W * 0.66, 1.8, W - 12, 2.4, 2.0, 3.2, 0.2), M.gold()]);
    if (p.half === 'B') out.push([slab(W - 4.4, 50, W - 2.6, 66, 1.4, 3.8, 0.4), M.dark()]); // mmWave module
    return out;
  },
  vapor: (p) => [[slab(p.x, p.y, p.x + p.w, p.y + p.h, p.z0, p.z1, 3), M.copper()]],
  frame: (p) => {
    const ring = halfShape(0);
    ring.holes.push(halfShape(1.3));
    const out = [[extrude(ring, 0, T, 16), M.titanium()]];
    // midplate behind the folding panel
    out.push([extrude(rrect(FLEX, 1.2, W - 1.2, H - 1.2, halfR(1.2)), 4.05, 4.3, 12), M.alu()]);
    // buttons on the outer rail of the right half are added in buildPhone; screw bosses
    for (const [x, y] of [[10, 4], [W - 9, 5], [10, H - 4], [W - 9, H - 4.5]]) out.push([cylZ(1.1, 3.0, 4.05, x, y, 16), M.alu()]);
    return out;
  },
};

// the hinge, in its own frame: the spine's centre line along y, the back toward -z
function buildHinge(p) {
  const out = [];
  const L = p.h, y0 = p.y, R = HINGE_R;
  // barrel sections (titanium) broken by 4 synchronisation gear trains and by the gap the flex cable runs through
  const gearAt = [y0 + 12, y0 + 38, y0 + L - 12];
  const GAP = [FLEXY[0] - 1.2, FLEXY[1] + 1.2];
  const cuts = [...gearAt.map((y) => [y - 5, y + 5, true]), [GAP[0], GAP[1], false]].sort((a, b) => a[0] - b[0]);
  let prev = y0;
  for (const [a, b, gear] of [...cuts, [y0 + L, y0 + L, false]]) {
    if (a > prev) {
      const g = new THREE.CylinderGeometry(R, R, a - prev, 40);
      g.translate(0, (a + prev) / 2, 0);
      out.push([g, M.titanium()]);
    }
    if (gear) for (let i = 0; i < 4; i++) {
      const r = R * (i % 2 ? 0.92 : 0.68);
      const g = new THREE.CylinderGeometry(r, r, 2.5, 12);
      g.translate(0, a + 1.25 + i * 2.5, 0);
      out.push([g, M.steel()]);
    }
    prev = b;
  }
  // the chain of linked joints on either side ("like a metal watch band") and their springs
  for (let y = y0 + 3; y < y0 + L - 4; y += 5.2) {
    if (y + 4 > GAP[0] && y < GAP[1]) continue;
    for (const sx of [-1, 1]) {
      const b = new THREE.BoxGeometry(1.3, 4.2, 1.5);
      b.translate(sx * (R + 0.85), y + 2.1, 0);
      out.push([b, M.steel()]);
    }
  }
  for (const y of [y0 + 24, y0 + 52, y0 + L - 26]) {
    for (const sx of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.55, 0.55, 7, 10);
      g.translate(sx * (R + 0.85), y, -1.25);
      out.push([g, M.gold()]);
    }
  }
  // the centre support bar under the fold
  const bar = new THREE.BoxGeometry(1.8, L - 4, 0.35);
  bar.translate(0, y0 + L / 2, R - 0.1);
  out.push([bar, M.carbon()]);
  return out;
}
const FLEXY = [80.6, 83.4]; // the accordion flex crosses the spine here (matches the 'flex' part in specs.js)

// ------------------------------------------------------------------ the phone
let TEX = {};

export function buildPhone() {
  TEX = {
    inner: canvasTex(1600, 1144, (c, w, h) => wallpaper(c, w, h, true)),
    cover: canvasTex(700, 1000, (c, w, h) => wallpaper(c, w, h, false)),
  };
  const root = new THREE.Group();
  root.scale.setScalar(0.1); // mm -> scene units (cm)
  const halfB = new THREE.Group();
  const pivotA = new THREE.Group();
  pivotA.position.set(0, 0, PIVOT_Z);
  const halfA = new THREE.Group();
  halfA.position.set(0, 0, -PIVOT_Z);
  halfA.scale.x = -1;
  pivotA.add(halfA);
  const spine = new THREE.Group();
  spine.position.set(0, 0, PIVOT_Z);
  const spineInner = new THREE.Group();
  spine.add(spineInner);
  root.add(halfB, pivotA, spine);

  const parts = {};
  const addPart = (p, parent, list, side) => {
    const slot = new THREE.Group();
    parent.add(slot);
    for (const [g, m] of list) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.part = p.id;
      m.userData.base = {opacity: 1, emissive: m.emissive ? m.emissive.clone() : null, ei: m.emissiveIntensity};
      slot.add(mesh);
    }
    const rec = parts[p.id] || (parts[p.id] = {p, slots: [], meshes: []});
    rec.slots.push({slot, side});
    slot.traverse((o) => o.isMesh && rec.meshes.push(o));
  };

  for (const p of PARTS) {
    if (p.kind === 'hinge') {
      addPart(p, spineInner, buildHinge(p), 'S');
    } else if (p.half === 'S') {
      addPart(p, halfB, BUILD[p.kind](p, 'B'), 'B');
      addPart(p, halfA, BUILD[p.kind](p, 'A'), 'A');
    } else {
      addPart(p, p.half === 'B' ? halfB : halfA, BUILD[p.kind](p, p.half), p.half);
    }
  }
  // ---- the bending strips across the spine: ribbons re-posed from the hinge angle on every update
  const NS = 28;
  function ribbon(mat, partId, uv) {
    const g = new THREE.PlaneGeometry(1, 1, NS, 1);
    if (uv) for (let i = 0; i <= NS; i++) for (let r = 0; r < 2; r++) g.attributes.uv.setXY(r * (NS + 1) + i, 0.5 + (FLEX * (1 - (2 * i) / NS)) / (2 * W), r ? uv[0] : uv[1]);
    mat.side = THREE.DoubleSide;
    mat.userData.base = {opacity: 1, emissive: mat.emissive ? mat.emissive.clone() : null, ei: mat.emissiveIntensity};
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.frustumCulled = false;
    m.userData.part = partId;
    root.add(m);
    parts[partId].meshes.push(m);
    return m;
  }
  const P_IN = parts.inner.p, P_FX = parts.flex.p;
  const STRIPS = [
    {m: ribbon(M.screen(TEX.inner), 'inner', [2.5 / H, (H - 2.5) / H]), p: P_IN, z: P_IN.z1 + LIFT, off: 0, y0: 2.5, y1: H - 2.5, bulge: 1.0},
    {m: ribbon(M.glassBlack(), 'inner'), p: P_IN, z: P_IN.z1 + LIFT, off: -0.85, y0: GLASS_IN, y1: H - GLASS_IN, bulge: 1.0},
    {m: ribbon(M.flex(), 'flex'), p: P_FX, z: (P_FX.z0 + P_FX.z1) / 2, off: 0, y0: FLEXY[0], y1: FLEXY[1], bulge: 0, pleat: 0.45},
  ];
  function poseStrip(st, phi, e) {
    const k = partProgress(e, st.p.step);
    const ox = st.p.out[0] * k, oy = st.p.out[1] * k, oz = st.p.out[2] * k;
    const c = Math.cos(phi), s = Math.sin(phi);
    const x0 = FLEX + ox, z0 = st.z + oz;
    const ax = -(FLEX + ox), adz = st.z + oz - PIVOT_Z;
    const x1 = ax * c + adz * s, z1 = -ax * s + adz * c + PIVOT_Z;
    const L = 2 * FLEX * (1 + Math.sin(phi / 2));
    const t0x = -L, t0z = 0, t1x = -c * L, t1z = s * L;
    const b = st.bulge * Math.sin(phi / 2) ** 2;
    const pos = st.m.geometry.attributes.position;
    for (let i = 0; i <= NS; i++) {
      const t = i / NS, t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      let x = h00 * x0 + h10 * t0x + h01 * x1 + h11 * t1x;
      let z = h00 * z0 + h10 * t0z + h01 * z1 + h11 * t1z;
      // derivative -> unit normal (toward the viewing side when flat)
      const d00 = 6 * t2 - 6 * t, d10 = 3 * t2 - 4 * t + 1, d01 = -6 * t2 + 6 * t, d11 = 3 * t2 - 2 * t;
      let dx = d00 * x0 + d10 * t0x + d01 * x1 + d11 * t1x, dz = d00 * z0 + d10 * t0z + d01 * z1 + d11 * t1z;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl;
      dz /= dl;
      const nx = -dz, nz = -dx; // flat: tangent (-1,0) -> normal (0,+1)
      const o = st.off - b * Math.sin(Math.PI * t) ** 2 + (st.pleat ? st.pleat * Math.sin(Math.PI * 14 * t) * Math.sin(Math.PI * t) : 0);
      x += nx * o;
      z += nz * o;
      pos.setXYZ(i, x, st.y1 + oy, z);
      pos.setXYZ(NS + 1 + i, x, st.y0 + oy, z);
    }
    pos.needsUpdate = true;
    st.m.geometry.computeVertexNormals();
  }

  // a centring offset so the open phone sits on the origin
  const holder = new THREE.Group();
  holder.add(root);
  root.position.set(0, -H / 20, 0);

  const tmp = new THREE.Vector3();
  function update(e, openDeg) {
    const phi = foldPhi(openDeg);
    pivotA.rotation.y = phi;
    spineInner.rotation.y = phi / 2;
    for (const id in parts) {
      const {p, slots} = parts[id];
      const k = partProgress(e, p.step);
      for (const {slot, side} of slots) {
        slot.position.set(p.out[0] * k, p.out[1] * k, p.out[2] * k);
        // the barrel rides the bisector: mid-body when open, 1.8 mm proud of the edge when closed
        if (side === 'S' && p.kind === 'hinge') slot.position.z -= hingeD(phi);
      }
    }
    for (const st of STRIPS) poseStrip(st, phi, e);
    // centre the body's envelope on the origin so a half-closed phone stays on the turntable
    const env = envelope(openDeg);
    root.position.x = -env.cx * 0.1;
    root.position.z = -env.cz * 0.1;
  }

  update(0, 180);
  return {object: holder, parts, update, textures: TEX};
}
