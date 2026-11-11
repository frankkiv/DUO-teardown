// The one source of truth. Every dimension the geometry uses and every number the panels print comes from here.
// Units: millimetres, grams, Wh, mAh.
//
// Where each number comes from (the page prints the same tag next to it):
//   o = Apple's spec page, apple.com/iphone-duo/specs (read 2026-11-11)
//   t = iFixit's teardown, ifixit.com/News/119895/iphone-duo-teardown (2026-10-25)
//   r = reported by the press, not on Apple's page (MacRumors roundup; a leaked regulatory filing via Digital Trends)
//   e = our estimate or inference: neither source states it
export const SRC = {o: ['官', 'Apple 官方規格'], t: ['拆', 'iFixit 實拆'], r: ['報', '媒體報導'], e: ['推', '本頁推定']};

export const BODY = {
  w: 82.3,        // one half: 164.6 mm unfolded width / 2 (o)
  h: 117.8,       // height (o)
  t: 5.2,         // thickness unfolded (o)
  r: 10.0,        // corner radius (e)
  gap: 0.9,       // air between the halves when closed: 11.3 folded (o) - 2 x 5.2
  spine: 1.8,     // the hinge cover stands this far out when closed: 84.1 folded width (o) - 82.3
  mass: 254,      // (o)
  folded: {w: 84.1, d: 11.3}, // (o), the model's own envelope must land on these
};

// Stack inside each half, from the back (z = 0) to the front (z = BODY.t, the inner display side).
// half: 'A' = left half (outer display on its back), 'B' = right half (camera plateau on its back), 'S' = both / spine.
// x from the spine outward, y from the bottom. out: travel at full explode (half's frame; +x = away from the spine,
// -z = toward the back). step: index into TEARDOWN. Part positions inside the body are our layout (e) unless noted:
// iFixit names the parts but does not say which half holds each one.
export const PARTS = [
  // ---- half B (right): cameras, logic board, charging
  {id: 'screws', sys: 'shell', half: 'B', name: '底部 Pentalobe 螺絲 ×4', kind: 'screws', z0: 1.6, z1: 3.6, x: 14, y: -0.5, w: 54, h: 4, mass: 0.2, out: [0, -22, 0], step: 1},
  {id: 'backB', sys: 'shell', half: 'B', name: '背蓋（Ceramic Shield）', kind: 'glass', z0: 0, z1: 0.55, x: 0, y: 0, w: 82.3, h: 117.8, mass: 13.5, out: [0, 0, -52], step: 2},
  {id: 'coil', sys: 'battery', half: 'B', name: 'MagSafe 線圈與磁鐵陣列', kind: 'coil', z0: 0.55, z1: 0.9, x: 16, y: 26, w: 50, h: 50, mass: 4.0, out: [0, 0, -42], step: 3},
  {id: 'cam', sys: 'camera', half: 'B', name: '48MP 雙鏡頭模組（主＋超廣角）', kind: 'camera', z0: -1.8, z1: 3.85, x: 46, y: 86, w: 32, h: 28, mass: 13.0, out: [8, 16, -34], step: 4},
  {id: 'board', sys: 'board', half: 'B', name: '邏輯板（單層）', kind: 'board', z0: 2.6, z1: 3.4, x: 5, y: 84, w: 39, h: 30, mass: 9.5, out: [-4, 14, -28], step: 5},
  {id: 'ioboard', sys: 'board', half: 'B', name: 'I/O 板', kind: 'ioboard', z0: 2.6, z1: 3.3, x: 59, y: 24, w: 18, h: 58, mass: 3.2, out: [10, 0, -24], step: 6},
  {id: 'usbc', sys: 'board', half: 'B', name: 'USB-C 連接埠', kind: 'usbc', z0: 1.4, z1: 3.8, x: 35, y: 0.6, w: 12, h: 8, mass: 1.3, out: [0, -16, -20], step: 6},
  {id: 'taptic', sys: 'taptic', half: 'B', name: 'Taptic Engine', kind: 'taptic', z0: 1.2, z1: 3.8, x: 50, y: 9, w: 26, h: 9, mass: 4.5, out: [8, -10, -22], step: 6},
  {id: 'spkB', sys: 'speaker', half: 'B', name: '底部揚聲器', kind: 'speaker', z0: 1.2, z1: 3.8, x: 6, y: 7, w: 26, h: 12, mass: 3.2, out: [-4, -12, -22], step: 6},
  {id: 'battB', sys: 'battery', half: 'B', name: '電池（小）7.5 Wh', kind: 'battery', z0: 1.0, z1: 3.9, x: 6, y: 24, w: 50, h: 56, mass: 30.0, out: [0, 0, -16], step: 7, wh: 7.5, mah: 1921},
  {id: 'vc', sys: 'thermal', half: 'B', name: '均熱板', kind: 'vapor', z0: 3.9, z1: 4.05, x: 4, y: 60, w: 74, h: 54, mass: 5.0, out: [0, 8, -8], step: 8},
  // ---- half A (left): outer display, the larger cell
  {id: 'cover', sys: 'screen', half: 'A', name: '外螢幕 5.4″（Ceramic Shield 2）', kind: 'cover', z0: 0, z1: 1.0, x: 0, y: 0, w: 82.3, h: 117.8, mass: 21.0, out: [0, 0, -52], step: 9},
  {id: 'selfie', sys: 'camera', half: 'A', name: '外螢幕 12MP Center Stage 前鏡頭', kind: 'selfie', z0: 1.0, z1: 3.6, x: 37, y: 103, w: 8, h: 8, mass: 1.0, out: [0, 12, -32], step: 10},
  {id: 'udc', sys: 'camera', half: 'A', name: '內螢幕螢幕下鏡頭', kind: 'udc', z0: 1.8, z1: 4.3, x: 12, y: 96, w: 9, h: 9, mass: 0.9, out: [-4, 14, -26], step: 10},
  {id: 'spkA', sys: 'speaker', half: 'A', name: '頂部揚聲器（聽筒）', kind: 'speaker', z0: 1.2, z1: 3.8, x: 50, y: 99, w: 26, h: 12, mass: 3.0, out: [4, 14, -22], step: 10},
  {id: 'battA', sys: 'battery', half: 'A', name: '電池（大）11.6 Wh', kind: 'battery', z0: 1.2, z1: 3.9, x: 6, y: 20, w: 70, h: 60, mass: 45.0, out: [0, 0, -16], step: 11, wh: 11.6, mah: 2962},
  // ---- rails
  {id: 'touchid', sys: 'controls', half: 'B', name: 'Touch ID 側邊按鈕', kind: 'button', z0: 1.5, z1: 3.7, x: 82.1, y: 72, w: 0.7, h: 11, mass: 0.6, out: [16, 0, 0], step: 12, rail: 'side'},
  {id: 'camctl', sys: 'controls', half: 'B', name: '相機控制', kind: 'button', z0: 1.6, z1: 3.6, x: 82.15, y: 30, w: 0.35, h: 15, mass: 0.8, out: [16, 0, 0], step: 12, rail: 'side', flush: true},
  {id: 'volume', sys: 'controls', half: 'B', name: '音量鍵（頂部）', kind: 'button', z0: 1.5, z1: 3.7, x: 20, y: 117.6, w: 24, h: 0.7, mass: 0.7, out: [0, 16, 0], step: 12, rail: 'top'},
  {id: 'antA', sys: 'antenna', half: 'A', name: '天線段（左框）', kind: 'antenna', z0: 0, z1: 5.2, x: 0, y: 0, w: 82.3, h: 117.8, mass: 1.6, out: [12, 0, 0], step: 12},
  {id: 'antB', sys: 'antenna', half: 'B', name: '天線段（右框）＋ mmWave', kind: 'antenna', z0: 0, z1: 5.2, x: 0, y: 0, w: 82.3, h: 117.8, mass: 1.8, out: [12, 0, 0], step: 12},
  {id: 'magnets', sys: 'hinge', half: 'S', name: '閉合磁鐵陣列', kind: 'magnets', z0: 2.2, z1: 3.8, x: 77.6, y: 28, w: 2.6, h: 60, mass: 3.0, out: [6, 0, -12], step: 12},
  // ---- spine
  {id: 'flex', sys: 'hinge', half: 'S', name: '跨鉸鏈風琴式排線', kind: 'flexends', z0: 2.4, z1: 2.6, x: 7, y: 80.6, w: 12, h: 2.8, mass: 0.8, out: [0, 0, -22], step: 13},
  {id: 'hinge', sys: 'hinge', half: 'S', name: '鈦合金水滴鉸鏈（100+ 零件）', kind: 'hinge', z0: 0, z1: 5.2, x: 0, y: 2, w: 0, h: 113.8, mass: 20.0, out: [0, 0, -30], step: 13},
  {id: 'plates', sys: 'hinge', half: 'S', name: '碳纖維支撐板', kind: 'plates', z0: 4.05, z1: 4.3, x: 0.9, y: 1.5, w: 6.1, h: 114.8, mass: 2.4, out: [0, 0, -9], step: 13},
  {id: 'frameA', sys: 'shell', half: 'A', name: '鈦金屬邊框＋鋁內框（左）', kind: 'frame', z0: 0, z1: 5.2, x: 0, y: 0, w: 82.3, h: 117.8, mass: 20.0, out: [30, 0, 0], step: 13},
  {id: 'frameB', sys: 'shell', half: 'B', name: '鈦金屬邊框＋鋁內框（右）', kind: 'frame', z0: 0, z1: 5.2, x: 0, y: 0, w: 82.3, h: 117.8, mass: 20.0, out: [30, 0, 0], step: 13},
  {id: 'inner', sys: 'screen', half: 'S', name: '內螢幕 7.6″ 折疊 OLED', kind: 'inner', z0: 4.3, z1: 5.2, x: 0, y: 0, w: 164.6, h: 117.8, mass: 24.0, out: [0, 0, 44], step: 14},
];

// The order a bench would take it apart. iFixit describes how each part comes out but publishes no numbered sequence,
// so the order itself is our reconstruction (e); each note says what the teardown reported.
export const TEARDOWN = [
  {step: 0, title: '完整機身', note: '合起 84.1 × 117.8 × 11.3 mm，展開 164.6 × 117.8 × 5.2 mm，254 g。'},
  {step: 1, title: '卸下入口的 Pentalobe 螺絲', note: 'iFixit：入口處是 Pentalobe 螺絲，「四顆而不是兩顆」；整機共用到五種起子。'},
  {step: 2, title: '打開背蓋', note: 'iFixit：背蓋與外螢幕用卡扣和螺絲固定，另有膠條密封防水（IP68）。'},
  {step: 3, title: '取下 MagSafe 線圈', note: '充電線路只在這一半，另一顆電池透過跨鉸鏈排線充電（iFixit）。'},
  {step: 4, title: '取出後置相機模組', note: '48MP Fusion 主鏡頭 ƒ/1.6 ＋ 48MP 超廣角 ƒ/2.2，裝在相機高台下方。'},
  {step: 5, title: '拆邏輯板', note: 'iFixit：單層邏輯板，不是堆疊式；部分功能分到另一片 I/O 板。'},
  {step: 6, title: 'I/O 板、USB-C、Taptic Engine、底部揚聲器', note: 'iFixit：相機與充電相關零件不用多拆就拿得到。'},
  {step: 7, title: '通電解膠，取出小電池', note: 'iFixit：兩顆電池都用電解離型膠，接上 9 V 等一下就能直接拿起，不必撬。'},
  {step: 8, title: '均熱板', note: 'Apple 稱均熱板讓持續效能比 iPhone 17 Pro 高最多 35%（MacRumors 轉述）。'},
  {step: 9, title: '翻到另一半：拆外螢幕', note: 'iFixit：外螢幕完整取下，好幾項內部維修都要先經過它。'},
  {step: 10, title: '前鏡頭、螢幕下鏡頭、頂部揚聲器', note: '三個相機模組、四顆鏡頭；內螢幕鏡頭藏在像素排列的間隙後面（iFixit）。'},
  {step: 11, title: '通電解膠，取出大電池', note: '11.6 Wh；兩顆合計 19.1 Wh，電芯外有金屬殼（iFixit）。'},
  {step: 12, title: '按鍵、閉合磁鐵與天線段', note: 'Touch ID 在側邊按鈕；相機控制在右側，音量鍵在頂部（Apple）。'},
  {step: 13, title: '排線、鉸鏈、支撐板與兩半邊框', note: 'iFixit：同步齒輪、彈簧和一串像錶帶的金屬關節，圍出水滴形空間；風琴式排線穿過鉸鏈傳電力與資料。'},
  {step: 14, title: '取下內螢幕', note: 'iFixit：先撬開邊條卡扣；螢幕由十多層超薄材料疊成，原廠換修 999 美元，是整機最難修的部分。'},
];

// lines: [label, value, source tag]
export const SYSTEMS = {
  screen: {
    name: '螢幕', key: '1',
    lines: [
      ['內螢幕', '7.6″ 折疊 OLED · 2670×1878 · 430 ppi · nano-texture', 'o'],
      ['外螢幕', '5.4″ OLED · 2034×1398 · 460 ppi · Ceramic Shield 2', 'o'],
      ['更新率', 'ProMotion，最高 120 Hz（兩面皆是）', 'o'],
      ['亮度', '1000 nits 典型 · 1600 HDR · 3000 戶外峰值', 'o'],
      ['內螢幕結構', '十多層超薄材料與膠；最上層 nano-texture 聚合物膜可單獨更換', 't'],
    ],
    blurb: '內螢幕是一整片可彎曲的 OLED，跨過鉸鏈；外螢幕在左半邊背面，合起來時當一般手機用。',
  },
  hinge: {
    name: '鉸鏈', key: '2',
    lines: [
      ['形式', '水滴形彎折空間，螢幕以大半徑彎曲', 't'],
      ['機構', '同步齒輪、彈簧、一串互扣的金屬關節', 't'],
      ['材質', '鈦合金鉸鏈、3D 列印鈦外蓋、碳纖維支撐板', 'r'],
      ['零件數', '超過 100 個', 'r'],
      ['閉合', '磁鐵陣列吸合', 'r'],
      ['排線', '風琴式排線穿過鉸鏈，傳電力與資料', 't'],
      ['已知疑慮', '中央支撐條若下沉不足會頂到彎曲的螢幕（iFixit 模擬的可能原因之一）', 't'],
    ],
    blurb: '合起來時螢幕在鉸鏈裡彎成水滴形，不是硬對折。iFixit 的粉塵測試中，仍有少量粉塵進到鉸鏈活動件。',
  },
  battery: {
    name: '電池', key: '3',
    lines: [],  // filled from PARTS by kin.js so the panel and the parts never disagree
    blurb: '兩顆電芯分在兩半邊，都用通電即可解膠的離型膠固定，iFixit 稱這是折疊機裡最好拆的電池。',
  },
  board: {
    name: '主機板', key: '4',
    lines: [
      ['SoC', 'A20 Pro · 6 核 CPU（2 超級＋4 效率）· 7 核 GPU', 'o'],
      ['製程', '2 nm', 'r'],
      ['記憶體', '12 GB', 'r'],
      ['儲存', '256 GB / 512 GB / 1 TB / 2 TB', 'o'],
      ['數據機', 'Apple C2 · sub-6 與 mmWave 5G', 'o'],
      ['無線', 'N1 晶片：Wi-Fi 7、藍牙 6、Thread', 'o'],
      ['結構', '單層邏輯板＋單層 I/O 板', 't'],
      ['連接埠', 'USB-C（USB 3，最高 10 Gb/s、DisplayPort）', 'o'],
      ['板上晶片位置', '模型中的晶片排列', 'e'],
    ],
    blurb: 'iFixit 拆到的是單層板而非 iPhone 常見的堆疊板。板子放在哪一半、晶片怎麼排，拆解文沒有寫，這裡是推定配置。',
  },
  camera: {
    name: '相機', key: '5',
    lines: [
      ['主鏡頭', '48MP Fusion · 26 mm · ƒ/1.6 · 感光元件位移 OIS', 'o'],
      ['2× 望遠', '12MP 光學品質 2× · 52 mm · ƒ/1.6', 'o'],
      ['超廣角', '48MP Fusion · 13 mm · ƒ/2.2 · 120°', 'o'],
      ['外螢幕前鏡頭', '12MP Center Stage · ƒ/2.2', 'o'],
      ['內螢幕前鏡頭', '螢幕下鏡頭 · ƒ/1.8 · 1080p', 'o'],
      ['模組數', '3 個模組、4 顆鏡頭', 't'],
      ['高台上的鏡頭排列', '模型中的位置', 'e'],
    ],
    blurb: '後鏡頭在右半邊背面的相機高台上，合起或展開都能用。',
  },
  taptic: {
    name: 'Taptic Engine', key: '6',
    lines: [
      ['功能', 'Haptic Touch 觸覺回饋', 'o'],
      ['位置與尺寸', '模型中的位置', 'e'],
    ],
    blurb: '線性馬達產生短而清脆的觸覺回饋。Apple 與 iFixit 都沒有提到它的位置，這裡放在右半邊底部。',
  },
  speaker: {
    name: '揚聲器', key: '7',
    lines: [
      ['配置', '內建立體聲揚聲器', 'o'],
      ['位置', '頂部與底部各一', 'r'],
    ],
    blurb: 'iFixit 的粉塵測試裡，揚聲器網孔是粉塵聚集的地方之一。',
  },
  antenna: {
    name: '天線', key: '8',
    lines: [
      ['蜂巢', '5G sub-6 ＋ mmWave（n258 / n260 / n261）· 4×4 MIMO', 'o'],
      ['無線', 'Wi-Fi 7（2×2）· 藍牙 6 · 第二代 UWB · NFC', 'o'],
      ['衛星', '緊急 SOS、訊息、尋找', 'o'],
      ['邊框', '鈦金屬（85% 再生鈦）', 'o'],
      ['斷點與天線段位置', '模型中的位置', 'e'],
    ],
    blurb: '金屬邊框以塑料斷點分段當天線用是 iPhone 的一貫做法；Duo 的斷點位置沒有公開資料，這裡是推定。',
  },
  thermal: {
    name: '散熱', key: '9',
    lines: [
      ['均熱板', '有；持續效能比 iPhone 17 Pro 高最多 35%', 'r'],
      ['位置與尺寸', '模型中的位置（蓋在邏輯板與相機上方）', 'e'],
    ],
    blurb: 'iFixit 的拆解文沒有描述散熱結構，均熱板來自媒體轉述的 Apple 說法。',
  },
  controls: {
    name: '按鍵', key: '0',
    lines: [
      ['Touch ID', '指紋感應器內建於側邊按鈕', 'o'],
      ['相機控制', '右側', 'o'],
      ['音量鍵', '頂部', 'r'],
      ['動作按鈕／靜音鍵', '無', 'r'],
      ['Face ID', '無', 'r'],
    ],
    blurb: '機身只有 5.2 mm 厚，沒有空間放 Face ID 模組，改用側邊 Touch ID。',
  },
};

export const SYS_ORDER = ['screen', 'hinge', 'battery', 'board', 'camera', 'taptic', 'speaker', 'antenna', 'thermal', 'controls'];

export const BATTERY = {
  hours: [['影片播放', '外螢幕最長 44 小時 · 內螢幕 31 小時', 'o'], ['充電', 'USB-C 約 20 分鐘 50%（需 60 W 充電器）· MagSafe / Qi2 最高 25 W', 'o']],
};
