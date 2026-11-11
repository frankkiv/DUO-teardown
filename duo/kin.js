// The math. Two inputs, explode e in [0,1] and the hinge's open angle in degrees (0 = closed, 180 = flat),
// and every pose and every readout as a function of them. No three.js in here.
import {BATTERY, BODY, PARTS, SYSTEMS, TEARDOWN} from './specs.js';

export const STEPS = TEARDOWN.length - 1; // 13 removal steps after the intact phone
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smoother = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const D2R = Math.PI / 180;

// Progress of one part out of the phone: each teardown step owns one slice of e, in order.
export function partProgress(e, step) {
  return smoother(e * STEPS - (step - 1));
}

// The step the bench is on at explode e (0 = intact).
export function stepAt(e) {
  return clamp(Math.ceil(e * STEPS - 0.02), 0, STEPS);
}

// Explode value at which a step's parts are fully out.
export const explodeFor = (step) => step / STEPS;

// The left half turns about a line on the spine, half the closed gap in front of the screens (x = 0, z = t + gap/2),
// by phi = 180 - open angle. Closed, the two halves sit BODY.gap apart: 2 x 5.2 + 0.9 = 11.3 mm, Apple's figure.
export const PIVOT_Z = BODY.t + BODY.gap / 2;
export const foldPhi = (openDeg) => (180 - openDeg) * D2R;

// The hinge barrel: radius HINGE_R, its centre a distance d behind the pivot along the bisector of the two halves.
// Open, it hides mid-body; closed, it stands BODY.spine proud of the edge: 82.3 + 1.8 = 84.1 mm, Apple's figure.
export const HINGE_R = 2.2;
export function hingeD(phi) {
  const dOpen = PIVOT_Z - BODY.t / 2, dClosed = BODY.spine - HINGE_R;
  return dOpen + (dClosed - dOpen) * Math.sin(phi / 2) ** 2;
}

// Extents of the whole body at an open angle: the right half is fixed, the left half's corners rotate, the barrel adds its own.
export function envelope(openDeg) {
  const {w, t} = BODY;
  const phi = foldPhi(openDeg);
  const c = Math.cos(phi), s = Math.sin(phi);
  const xs = [0, w], zs = [0, t];
  for (const [x, z] of [[-w, 0], [-w, t], [0, 0], [0, t]]) {
    const dz = z - PIVOT_Z;
    xs.push(x * c + dz * s);
    zs.push(-x * s + dz * c + PIVOT_Z);
  }
  const d = hingeD(phi), hx = -d * Math.sin(phi / 2), hz = PIVOT_Z - d * Math.cos(phi / 2);
  xs.push(hx - HINGE_R, hx + HINGE_R);
  zs.push(hz - HINGE_R, hz + HINGE_R);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  return {width: x1 - x0, depth: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2};
}

export const TOTAL_MASS = BODY.mass; // Apple's figure; the part masses are estimates scaled to add up to it
export const PARTS_MASS = PARTS.reduce((m, p) => m + p.mass, 0);
export const CELLS = PARTS.filter((p) => p.wh);
export const WH = CELLS.reduce((m, p) => m + p.wh, 0);
export const MAH = CELLS.reduce((m, p) => m + p.mah, 0);

SYSTEMS.battery.lines = [
  ...CELLS.map((p) => [p.half === 'B' ? '右半（小）' : '左半（大）', `${p.wh.toFixed(1)} Wh`, 't']),
  ['合計', `${WH.toFixed(1)} Wh`, 't'],
  ['容量', `${CELLS.map((p) => p.mah.toLocaleString()).join(' ＋ ')} ＝ ${MAH.toLocaleString()} mAh（外流的認證文件）`, 'r'],
  ['固定方式', '電解離型膠，通電後鬆脫；電芯外有金屬殼', 't'],
  ...BATTERY.hours,
];

// Mass of a system, summed from its parts.
export const sysMass = (sys) => PARTS.filter((p) => p.sys === sys).reduce((m, p) => m + p.mass, 0);

// Every number the console prints.
export function readouts(e, openDeg) {
  const env = envelope(openDeg);
  const s = stepAt(e);
  const out = PARTS.filter((p) => partProgress(e, p.step) > 0.5).length;
  return {
    open: openDeg,
    width: env.width,
    depth: env.depth,
    step: s,
    stepInfo: TEARDOWN[s],
    partsOut: out,
    partsTotal: PARTS.length,
    mass: TOTAL_MASS,
    mah: MAH,
    wh: WH,
    partsMass: PARTS_MASS,
  };
}
