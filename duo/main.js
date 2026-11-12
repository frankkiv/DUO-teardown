// The live page: a pale studio, the phone, sliders for the two inputs, a button per subsystem, an info panel that
// reads specs.js, labels with leaders, and the auto tour from tour.js. Any click, drag, wheel or key hands control to
// the visitor; 25 s of quiet hands it back to the tour.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildPhone} from './model.js';
import {PARTS, SRC, SYSTEMS, SYS_ORDER, TEARDOWN} from './specs.js';
import {clamp, explodeFor, readouts, STEPS, stepAt, sysMass, D2R} from './kin.js';
import {DURATION, stateAt} from './tour.js';

const ACCENT = new THREE.Color('#e8562a');
const IDLE = 25;
const params = new URLSearchParams(location.search);
const STILL = params.has('t') ? Number(params.get('t')) : null; // ?t=12.5 renders one tour frame (for review)

// ------------------------------------------------------------------ renderer & studio
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: STILL !== null});
renderer.setPixelRatio(Math.min(1.5, devicePixelRatio));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef0f2');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(32, 1, 4, 300);
const key = new THREE.DirectionalLight('#ffffff', 2.2);
key.position.set(14, 30, 18);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -24;
key.shadow.camera.right = key.shadow.camera.top = 24;
key.shadow.camera.near = 5;
key.shadow.camera.far = 80;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight('#dfe8ff', 0.8);
rim.position.set(-20, 10, -25);
scene.add(rim);
scene.add(new THREE.HemisphereLight('#ffffff', '#d9d4cc', 0.5));

const GROUND_Y = -8.6;
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.ShadowMaterial({opacity: 0.16, polygonOffset: true, polygonOffsetFactor: -1}));
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
ground.receiveShadow = true;
scene.add(ground);
// a faint disc so the phone has a floor to stand over
const disc = new THREE.Mesh(new THREE.CircleGeometry(17, 64), new THREE.MeshBasicMaterial({color: '#e6e9ec'}));
disc.rotation.x = -Math.PI / 2;
disc.position.y = GROUND_Y - 0.01;
scene.add(disc);

const phone = buildPhone();
scene.add(phone.object);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 14;
controls.maxDistance = 110;
controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0, 0, 0);

function camFrom(az, el, dist, ty) {
  const a = az * D2R, e = el * D2R;
  camera.position.set(Math.sin(a) * Math.cos(e) * dist, ty + Math.sin(e) * dist, Math.cos(a) * Math.cos(e) * dist);
  controls.target.set(0, ty, 0);
  camera.lookAt(controls.target);
}
function camNow() {
  const v = camera.position.clone().sub(controls.target);
  const dist = v.length();
  return {az: Math.atan2(v.x, v.z) / D2R, el: Math.asin(clamp(v.y / dist, -1, 1)) / D2R, dist, ty: controls.target.y};
}

// ------------------------------------------------------------------ the free region
// On a phone the panels cover the top and bottom of the canvas. Aim the camera at the part of the screen that is
// left (setViewOffset slides the projection centre there) and widen the view so the phone fits in it.
let viewDirty = true;
const small = matchMedia('(max-width:900px) and (orientation:portrait), (max-height:500px) and (orientation:landscape)');
function freeRect(W, H) {
  if (!small.matches) return {l: 0, t: 0, r: W, b: H};
  const L = document.getElementById('left').getBoundingClientRect(), R = document.getElementById('right').getBoundingClientRect();
  if (W > H) return {l: L.right, t: 0, r: R.left, b: H};
  return {l: 0, t: L.bottom, r: W, b: R.top};
}
function fitView(W, H) {
  viewDirty = false;
  const f = freeRect(W, H);
  const fw = Math.max(80, f.r - f.l), fh = Math.max(80, f.b - f.t);
  // the desktop framing is a 32° vertical view on a ~16:10 screen; keep that framing inside the free rectangle
  const k = (H / fh) * Math.max(1, 1.0 / (fw / fh));
  camera.aspect = W / H;
  camera.fov = Math.min(100, (2 * Math.atan(Math.tan(16 * D2R) * k)) / D2R);
  const cx = (f.l + f.r) / 2, cy = (f.t + f.b) / 2;
  if (small.matches) camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  document.documentElement.style.setProperty('--cap-top', `${Math.round(f.b - 8)}px`);
}
small.addEventListener('change', () => (viewDirty = true));
addEventListener('load', () => (viewDirty = true));
if (document.fonts) document.fonts.ready.then(() => (viewDirty = true));
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => (viewDirty = true));
  ro.observe(document.getElementById('left'));
  ro.observe(document.getElementById('right'));
}

// ------------------------------------------------------------------ the console (DOM)
const $ = (s) => document.querySelector(s);
const sysBtns = $('#systems');
for (const id of SYS_ORDER) {
  const b = document.createElement('button');
  b.className = 'sys';
  b.dataset.sys = id;
  b.innerHTML = `<kbd>${SYSTEMS[id].key}</kbd>${SYSTEMS[id].name}`;
  sysBtns.appendChild(b);
}
const exSlider = $('#explode');
const hgSlider = $('#hinge');
const ticks = $('#ticks');
for (let s = 1; s <= STEPS; s++) {
  const i = document.createElement('i');
  i.style.left = `${(s / STEPS) * 100}%`;
  ticks.appendChild(i);
}

const live = {explode: 0, open: 180, focus: null, xray: false, pick: null};
const target = {explode: 0, open: 180};
let mode = 'tour';
let tourT0 = performance.now() / 1000;
let lastInput = -1e9;
let blendFrom = null;

function setFocus(sys, fromUser) {
  live.pick = null;
  live.focus = live.focus === sys && fromUser ? null : sys;
  if (fromUser && live.focus) {
    const parts = PARTS.filter((p) => p.sys === sys);
    const maxStep = Math.max(...parts.map((p) => p.step));
    target.explode = sys === 'screen' ? 1 : sys === 'controls' ? 0 : explodeFor(maxStep);
    target.open = 180;
    const v = VIEW[sys] || {az: 200, el: 18, dist: 50};
    flyTo(v);
  }
}
const VIEW = {
  screen: {az: 25, el: 12, dist: 62},
  hinge: {az: 160, el: 24, dist: 56},
  battery: {az: 200, el: 18, dist: 50},
  board: {az: 215, el: 20, dist: 44},
  camera: {az: 220, el: 16, dist: 42},
  taptic: {az: 215, el: 8, dist: 46},
  speaker: {az: 190, el: 12, dist: 52},
  antenna: {az: 180, el: 30, dist: 56},
  thermal: {az: 200, el: 22, dist: 50},
  controls: {az: 235, el: 24, dist: 52},
};
let fly = null;
function flyTo(v) {
  fly = {from: camNow(), to: {ty: 0, ...v}, t0: performance.now() / 1000, dur: 1.2};
  // take the short way round
  let d = fly.to.az - fly.from.az;
  d = ((((d + 180) % 360) + 360) % 360) - 180;
  fly.to.az = fly.from.az + d;
}

function takeOver() {
  lastInput = performance.now() / 1000;
  if (mode === 'tour') {
    mode = 'live';
    const s = currentState;
    target.explode = live.explode = s.explode;
    target.open = live.open = s.open;
    live.focus = s.focus && s.focusIsSys ? s.focus : null;
    document.body.classList.remove('touring');
  }
}
function startTour() {
  mode = 'tour';
  tourT0 = performance.now() / 1000;
  blendFrom = {...camNow(), explode: live.explode, open: live.open, t0: tourT0};
  fly = null;
  document.body.classList.add('touring');
}

// a click (not a drag) on a part selects it
const ray = new THREE.Raycaster();
let downAt = null;
canvas.addEventListener('pointerdown', (ev) => {
  takeOver();
  downAt = [ev.clientX, ev.clientY];
});
canvas.addEventListener('pointerup', (ev) => {
  if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5) return;
  ray.setFromCamera(new THREE.Vector2((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1), camera);
  const hit = ray.intersectObject(phone.object, true).find((h) => h.object.userData.part && h.object.material.opacity > 0.5);
  live.pick = hit ? hit.object.userData.part : null;
  if (hit) live.focus = null;
});
for (const b of document.querySelectorAll('[data-open]')) b.addEventListener('click', () => {
  takeOver();
  target.open = Number(b.dataset.open);
});
canvas.addEventListener('wheel', takeOver, {passive: true});
// phone: the bottom sheet opens from its handle or its title; the control strip shows more buttons on demand
const elRight = document.getElementById('right'), elLeft = document.getElementById('left');
const toggleSheet = (open) => {
  elRight.classList.toggle('open', open ?? !elRight.classList.contains('open'));
  viewDirty = true;
};
document.getElementById('sheetbar').addEventListener('click', () => toggleSheet());
document.getElementById('info').addEventListener('click', (ev) => {
  if (small.matches && ev.target.closest('h3')) toggleSheet();
});
document.getElementById('ctlmore').addEventListener('click', (ev) => {
  const open = elLeft.classList.toggle('open');
  ev.currentTarget.textContent = open ? '收起 ▴' : '更多 ▾';
  viewDirty = true;
});
sysBtns.addEventListener('click', (ev) => {
  const b = ev.target.closest('.sys');
  if (!b) return;
  takeOver();
  setFocus(b.dataset.sys, true);
});
exSlider.addEventListener('input', () => {
  takeOver();
  target.explode = exSlider.value / 1000;
});
hgSlider.addEventListener('input', () => {
  takeOver();
  target.open = Number(hgSlider.value);
});
$('#xray').addEventListener('click', () => {
  takeOver();
  live.xray = !live.xray;
});
$('#tour').addEventListener('click', () => (mode === 'tour' ? takeOver() : startTour()));
$('#reset').addEventListener('click', () => {
  takeOver();
  target.explode = 0;
  target.open = 180;
  live.focus = null;
  live.pick = null;
  live.xray = false;
  flyTo({az: 22, el: 12, dist: 40});
});
$('#prev').addEventListener('click', () => stepBy(-1));
$('#next').addEventListener('click', () => stepBy(1));
function stepBy(d) {
  takeOver();
  const s = clamp(stepAt(target.explode) + d, 0, STEPS);
  target.explode = explodeFor(s);
  target.open = 180;
  live.focus = null;
  live.pick = null;
}
addEventListener('keydown', (ev) => {
  if (ev.target.tagName === 'INPUT' && ev.key !== 'Escape') return;
  takeOver();
  const sys = SYS_ORDER.find((s) => SYSTEMS[s].key === ev.key);
  if (sys) setFocus(sys, true);
  else if (ev.key === 'ArrowRight') stepBy(1);
  else if (ev.key === 'ArrowLeft') stepBy(-1);
  else if (ev.key === 'x' || ev.key === 'X') live.xray = !live.xray;
  else if (ev.key === 'f' || ev.key === 'F') target.open = target.open > 90 ? 0 : 180;
  else if (ev.key === 'e' || ev.key === 'E') target.explode = target.explode > 0.5 ? 0 : 1;
  else if (ev.key === 'Escape') live.focus = live.pick = null;
  else if (ev.key === ' ') {
    ev.preventDefault();
    startTour();
  }
});

// ------------------------------------------------------------------ highlight / ghost
const recs = Object.values(phone.parts);
const SHELL = new Set(['backB', 'cover', 'frameA', 'frameB', 'inner', 'screws']);
let lastLook = '';
function applyLook(focusSys, stepHL, xray, pick) {
  const sig = `${focusSys}|${stepHL}|${xray}|${pick}`;
  if (sig === lastLook) return;
  lastLook = sig;
  for (const r of recs) {
    const on = pick ? r.p.id === pick : focusSys ? r.p.sys === focusSys : stepHL > 0 && r.p.step === stepHL;
    let op = 1;
    if (focusSys && !on) op = 0.1;
    else if (xray && SHELL.has(r.p.id) && !on) op = 0.14;
    for (const m of r.meshes) {
      const mat = m.material;
      const base = mat.userData.base || {};
      if (mat.transparent !== op < 1) mat.needsUpdate = true;
      mat.transparent = op < 1;
      mat.opacity = op;
      mat.depthWrite = op >= 1;
      m.castShadow = op >= 1;
      if (mat.emissive && !mat.emissiveMap) {
        if (on) {
          mat.emissive.copy(ACCENT);
          mat.emissiveIntensity = 0.32;
        } else if (base.emissive) {
          mat.emissive.copy(base.emissive);
          mat.emissiveIntensity = base.ei;
        }
      }
    }
  }
}

// ------------------------------------------------------------------ labels
const labelLayer = $('#labels');
const svg = $('#leaders');
const labelEls = new Map();
const box = new THREE.Box3();
const v3 = new THREE.Vector3();
function labelFor(id) {
  let el = labelEls.get(id);
  if (!el) {
    el = document.createElement('div');
    el.className = 'lab';
    el.textContent = phone.parts[id].p.name;
    labelLayer.appendChild(el);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(line);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', 3.5);
    svg.appendChild(dot);
    el._line = line;
    el._dot = dot;
    labelEls.set(id, el);
  }
  return el;
}
function drawLabels(ids, W, H) {
  const shown = new Set(ids);
  for (const [id, el] of labelEls) {
    const vis = shown.has(id);
    el.style.display = vis ? '' : 'none';
    el._line.style.display = el._dot.style.display = vis ? '' : 'none';
  }
  // project centres, then spread labels vertically on the side of the screen each part is on
  const items = [];
  for (const id of ids) {
    const r = phone.parts[id];
    box.makeEmpty();
    for (const {slot} of r.slots) box.expandByObject(slot);
    box.getCenter(v3);
    v3.project(camera);
    const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
    items.push({id, x, y, side: x < W / 2 ? -1 : 1});
  }
  for (const side of [-1, 1]) {
    const col = items.filter((i) => i.side === side).sort((a, b) => a.y - b.y);
    let yPrev = -1e9;
    for (const it of col) {
      it.ly = Math.max(it.y, yPrev + 34);
      yPrev = it.ly;
    }
    for (const it of col) {
      const el = labelFor(it.id);
      const lw = el._w || (el._w = el.offsetWidth) || 120;
      const wide = W > 900;
      const minX = wide ? 324 : 8, maxX = wide ? W - 352 : W - 8;
      const lx = side < 0 ? Math.max(minX + lw, it.x - 90) : Math.min(maxX - lw, it.x + 90);
      el.style.transform = `translate(${side < 0 ? lx - lw : lx}px, ${it.ly - 13}px)`;
      el._line.setAttribute('d', `M${it.x},${it.y} L${lx + (side < 0 ? 6 : -6)},${it.ly}`);
      el._dot.setAttribute('cx', it.x);
      el._dot.setAttribute('cy', it.y);
    }
  }
}

// ------------------------------------------------------------------ console text
const tag = (k) => `<i class="src s-${k}" title="${SRC[k][1]}">${SRC[k][0]}</i>`;
const elInfo = $('#info');
let infoSig = '';
function drawInfo(focus, ro, pick) {
  const sig = `${focus}|${ro.step}|${pick}`;
  if (sig === infoSig) return;
  infoSig = sig;
  if (pick) {
    const p = phone.parts[pick].p;
    const sysName = SYSTEMS[p.sys] ? SYSTEMS[p.sys].name : '外殼';
    const size = p.kind === 'hinge' ? `⌀${(p.z1 - p.z0).toFixed(1)} × ${p.h} mm` : `${p.w} × ${p.h} × ${(p.z1 - p.z0).toFixed(2)} mm`;
    elInfo.innerHTML = `<h3>${p.name}</h3><table>
      <tr><th>系統</th><td>${sysName}</td></tr><tr><th>尺寸</th><td>${size}${tag('e')}</td></tr><tr><th>重量</th><td>約 ${p.mass.toFixed(1)} g（佔整機 ${((p.mass / ro.mass) * 100).toFixed(1)}%）${tag('e')}</td></tr>
      ${p.wh ? `<tr><th>容量</th><td>${p.wh.toFixed(1)} Wh${tag('t')}　${p.mah.toLocaleString()} mAh${tag('r')}</td></tr>` : ''}
      <tr><th>拆解步驟</th><td>${p.step} / ${STEPS}　${TEARDOWN[p.step].title}</td></tr></table>`;
  } else if (focus) {
    const S = SYSTEMS[focus];
    const parts = PARTS.filter((p) => p.sys === focus);
    elInfo.innerHTML = `<h3>${S.name}</h3><p>${S.blurb}</p><table>${S.lines.map(([a, b, k]) => `<tr><th>${a}</th><td>${b}${tag(k)}</td></tr>`).join('')}
      <tr><th>零件</th><td>${parts.length} 個 · 約 ${sysMass(focus).toFixed(1)} g${tag('e')}</td></tr></table>`;
  } else {
    const st = TEARDOWN[ro.step];
    const parts = PARTS.filter((p) => p.step === ro.step);
    elInfo.innerHTML = `<h3>${ro.step ? `步驟 ${ro.step} / ${STEPS}` : '完整機身'}</h3><p><b>${st.title}</b>　${st.note}</p>${
      parts.length ? `<table>${parts.map((p) => `<tr><th>${p.name}</th><td>約 ${p.mass.toFixed(1)} g${tag('e')}</td></tr>`).join('')}</table>` : ''
    }`;
  }
}
const elRO = {
  open: $('#r-open'), width: $('#r-width'), depth: $('#r-depth'), parts: $('#r-parts'), mass: $('#r-mass'), bat: $('#r-bat'),
};
elRO.mass.textContent = `${readouts(0, 180).mass.toFixed(0)} g`;
elRO.bat.textContent = `${readouts(0, 180).wh.toFixed(1)} Wh`;

// write to the DOM only when the value changes: layout work every frame costs more than the 3D
const setText = (el, s) => el._s !== s && ((el._s = s), (el.textContent = s));
const setHTML = (el, s) => el._s !== s && ((el._s = s), (el.innerHTML = s));
const setStyle = (el, k, v) => el['_' + k] !== v && ((el['_' + k] = v), (el.style[k] = v));
const elCap = $('#caption'), elBar = $('#tourbar'), elTour = $('#tour'), elXray = $('#xray');

// ------------------------------------------------------------------ frame loop
let currentState = null;
let lastUi = '';
const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
let lastT = performance.now() / 1000;
const TIERS = [{pr: 1.5, shadow: 2048}, {pr: 1.25, shadow: 2048}, {pr: 1, shadow: 1024}, {pr: 0.75, shadow: 1024}];
let tier = 0, tierFrames = 0, emaDt = 0.016;

function frame(nowMs) {
  const now = STILL !== null ? 0 : nowMs / 1000;
  const dt = Math.min(0.05, now - lastT);
  lastT = now;
  const W = innerWidth, H = innerHeight;
  if (canvas.width !== Math.round(W * renderer.getPixelRatio()) || canvas.height !== Math.round(H * renderer.getPixelRatio())) {
    renderer.setSize(W, H, false);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    viewDirty = true;
  }
  if (viewDirty) fitView(W, H);

  // quality tiers: a slow GPU gets a lower pixel ratio, then smaller shadows
  if (STILL === null && dt > 0) {
    emaDt += (dt - emaDt) * 0.05;
    if (++tierFrames > 50 && emaDt > 0.024 && tier < TIERS.length - 1) {
      tier++;
      tierFrames = 0;
      emaDt = 0.016;
      renderer.setPixelRatio(Math.min(TIERS[tier].pr, devicePixelRatio));
      if (TIERS[tier].shadow !== key.shadow.mapSize.x) {
        key.shadow.mapSize.setScalar(TIERS[tier].shadow);
        key.shadow.map?.dispose();
        key.shadow.map = null;
      }
    }
  }

  if (mode === 'live' && STILL === null && now - lastInput > IDLE) startTour();

  let st;
  if (mode === 'tour') {
    const tt = STILL !== null ? STILL : now - tourT0;
    const s = stateAt(tt);
    st = {...s, focusIsSys: true};
    if (blendFrom) {
      const k = ease((now - blendFrom.t0) / 1.6);
      if (k >= 1) blendFrom = null;
      else {
        let daz = s.az - blendFrom.az;
        daz = ((((daz + 180) % 360) + 360) % 360) - 180;
        st.az = blendFrom.az + daz * k;
        for (const f of ['el', 'dist', 'ty', 'explode', 'open']) st[f] = blendFrom[f] + (s[f] - blendFrom[f]) * k;
      }
    }
    live.explode = st.explode;
    live.open = st.open;
    camFrom(st.az, st.el, st.dist, st.ty);
    exSlider.value = st.explode * 1000;
    hgSlider.value = st.open;
  } else {
    // ease the inputs toward the targets (critically damped)
    const k = 1 - Math.exp(-dt * 7);
    live.explode += (target.explode - live.explode) * k;
    live.open += (target.open - live.open) * k;
    if (Math.abs(target.explode - live.explode) < 1e-4) live.explode = target.explode;
    if (Math.abs(target.open - live.open) < 0.01) live.open = target.open;
    if (document.activeElement !== exSlider) exSlider.value = target.explode * 1000;
    if (document.activeElement !== hgSlider) hgSlider.value = target.open;
    if (fly) {
      const k2 = clamp((now - fly.t0) / fly.dur, 0, 1);
      const e2 = k2 < 0.5 ? 4 * k2 * k2 * k2 : 1 - Math.pow(-2 * k2 + 2, 3) / 2;
      const c = {};
      for (const f of ['az', 'el', 'dist', 'ty']) c[f] = fly.from[f] + (fly.to[f] - fly.from[f]) * e2;
      camFrom(c.az, c.el, c.dist, c.ty);
      if (k2 >= 1) fly = null;
    } else controls.update();
    st = {explode: live.explode, open: live.open, focus: live.focus, step: stepAt(live.explode), caption: null};
  }
  currentState = st;

  phone.update(live.explode, live.open);
  const ro = readouts(live.explode, live.open);

  // look: in the tour a caption's focus is a system; with none, the parts of the current step light up
  const focus = st.focus;
  const stepHL = !focus && st.step > 0 && live.explode < 0.999 ? st.step : 0;
  const pick = mode === 'live' ? live.pick : null;
  applyLook(focus, mode === 'tour' ? stepHL : 0, mode === 'live' && live.xray, pick);

  // console
  setText(elRO.open, `${live.open.toFixed(0)}°`);
  setText(elRO.width, `${ro.width.toFixed(1)} mm`);
  setText(elRO.depth, `${ro.depth.toFixed(1)} mm`);
  setText(elRO.parts, `${ro.partsOut} / ${ro.partsTotal}`);
  drawInfo(focus, {step: mode === 'tour' ? st.step : ro.step, mass: ro.mass}, pick);
  const uiSig = `${focus}|${live.xray}|${mode}`;
  if (uiSig !== lastUi) {
    lastUi = uiSig;
    for (const b of sysBtns.children) b.classList.toggle('on', b.dataset.sys === focus);
    elXray.classList.toggle('on', live.xray && mode === 'live');
    elTour.classList.toggle('on', mode === 'tour');
    elTour.lastChild.textContent = mode === 'tour' ? '自動導覽中' : '自動導覽';
  }
  if (mode === 'tour' && st.caption) {
    setStyle(elCap, 'opacity', '1');
    setHTML(elCap, `<b>${st.caption[0]}</b><span>${st.caption[1]}</span>`);
  } else setStyle(elCap, 'opacity', '0');
  setStyle(elBar, 'transform', `scaleX(${mode === 'tour' ? (((STILL ?? now - tourT0) % DURATION) / DURATION).toFixed(4) : 0})`);

  renderer.render(scene, camera);

  const ids = pick ? [pick] : focus
    ? [...new Set(PARTS.filter((p) => p.sys === focus).map((p) => p.id))]
    : stepHL
      ? PARTS.filter((p) => p.step === stepHL).map((p) => p.id)
      : [];
  drawLabels(ids, W, H);

  if (STILL === null) requestAnimationFrame(frame);
  else document.body.dataset.ready = '1';
}
document.body.classList.add('touring');
phone.update(0, 180);
renderer.compile(scene, camera); // build every shader before the first frame
requestAnimationFrame(frame);
