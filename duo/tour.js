// The auto tour as a pure function of time: stateAt(t) -> {explode, open, az, el, dist, ty, focus, step, caption}.
// Built once from the teardown order in specs.js, so the tour, the live page and any later film never drift.
import {PARTS, TEARDOWN} from './specs.js';
import {STEPS, smoother} from './kin.js';

const K = [];
const key = (t, s) => K.push({t, ...s, _set: Object.keys(s)});

const BACK = {az: 205, el: 16, dist: 46, ty: 0};
key(0, {explode: 0, open: 0, az: 28, el: 10, dist: 37, ty: 0, focus: null, step: 0, caption: ['iPhone Duo', '合起來是一支 5.4 吋手機：84.1 × 117.8 × 11.3 mm。']});
key(3.5, {explode: 0, open: 0, az: 48, el: 12, dist: 37, ty: 0});
key(4.0, {caption: ['打開', '鉸鏈 0 → 180°，展開成 7.6 吋內螢幕，厚度只有 5.2 mm。'], focus: null});
key(8.0, {explode: 0, open: 180, az: 18, el: 10, dist: 38, ty: 0});
key(10.0, {explode: 0, open: 180, az: 22, el: 10, dist: 38, ty: 0, caption: ['從背面開始拆', '依 iFixit 拆解的描述重建：先背蓋，鉸鏈與內螢幕最後。'], focus: null});
key(12.5, {explode: 0, open: 180, ...BACK});

const T0 = 13;
const DT = 3.4;
const camFor = (s) => {
  if (s === 1) return {az: 205, el: -4, dist: 40, ty: -2};
  if (s <= 8) return {az: 214 - s * 2.5, el: 18, dist: 46 + s, ty: 0};
  if (s <= 11) return {az: 162 - (s - 9) * 4, el: 16, dist: 50, ty: 0};
  if (s === 12) return {az: 215, el: 28, dist: 58, ty: 0};
  if (s === 13) return {az: 150, el: 26, dist: 66, ty: 0};
  return {az: 380, el: 14, dist: 62, ty: 0};
};
for (let s = 1; s <= STEPS; s++) {
  const t = T0 + (s - 1) * DT;
  const first = PARTS.find((p) => p.step === s);
  const sys = first.sys === 'shell' ? null : first.sys;
  key(t, {caption: [`${s} / ${STEPS}　${TEARDOWN[s].title}`, TEARDOWN[s].note], focus: sys, step: s});
  key(t + DT * 0.55, {explode: s / STEPS, open: 180, ...camFor(s)});
  key(t + DT, {explode: s / STEPS, open: 180, ...camFor(s)});
}
const TE = T0 + STEPS * DT;
key(TE, {caption: ['全部拆開', `${PARTS.length} 個零件，${TEARDOWN.length - 1} 個步驟。拖曳旋轉，按系統按鈕看每個子系統。`], focus: null, step: STEPS});
key(TE + 6, {explode: 1, open: 180, az: 560, el: 18, dist: 64, ty: 0});
key(TE + 6.2, {caption: ['裝回去', '倒過來的順序。'], focus: null, step: 0});
key(TE + 10.5, {explode: 0, open: 180, az: 740, el: 12, dist: 38, ty: 0});
key(TE + 13.5, {explode: 0, open: 0, az: 746, el: 10, dist: 37, ty: 0});
key(TE + 15, {explode: 0, open: 0, az: 748, el: 10, dist: 37, ty: 0});

export const DURATION = TE + 15;

// fill forward every field so each key is complete
const NUM = ['explode', 'open', 'az', 'el', 'dist', 'ty'];
for (let i = 1; i < K.length; i++) for (const f of [...NUM, 'focus', 'step', 'caption']) if (!(f in K[i])) K[i][f] = K[i - 1][f];
// numeric tracks only change at keys that set them; a key that only sets a caption holds nothing
const tracks = Object.fromEntries(NUM.map((f) => [f, K.filter((k, i) => i === 0 || k._set.includes(f)).map((k) => [k.t, k[f]])]));

function track(f, t) {
  const tr = tracks[f];
  if (t <= tr[0][0]) return tr[0][1];
  for (let i = 1; i < tr.length; i++) {
    if (t < tr[i][0]) {
      const [t0, v0] = tr[i - 1], [t1, v1] = tr[i];
      return v0 + (v1 - v0) * smoother((t - t0) / (t1 - t0));
    }
  }
  return tr[tr.length - 1][1];
}

export const BEATS = K.filter((k, i) => i === 0 || k.caption !== K[i - 1].caption).map((k) => k.t);

export function stateAt(time) {
  const t = ((time % DURATION) + DURATION) % DURATION;
  let k = K[0];
  for (const kk of K) if (kk.t <= t) k = kk;
  const st = {focus: k.focus, step: k.step, caption: k.caption};
  for (const f of NUM) st[f] = track(f, t);
  st.az = st.az % 360;
  return st;
}
