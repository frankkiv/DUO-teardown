# iPhone Duo teardown：研究筆記與提案

參考 repo：`reference-teardown/`（https://github.com/elvarofficial/teardown，MIT）

## 這個 repo 怎麼運作
- 本質是一個 Claude Code skill（SKILL.md）＋一套小型 runtime。請 Claude「做一個 X 的拆解模擬器」，它照 SKILL.md 的規則寫程式，產出**單一離線 HTML**（three.js、字型全部內嵌，目標 < 1 MB）。
- 技術：three.js 0.186（程式碼建模，不用外部模型檔）、esbuild 打包、Playwright 逐格截圖錄 60fps 影片、ffmpeg 合成、純 Python 合成音效（-14 LUFS）。
- 每台機器分三個資料夾：`<name>-shared`（機器本體）、`<name>-live`（可操作頁面）、`<name>-film`（自動導覽／錄影腳本 + timeline.json）。
- shared 內分工：數學（真實尺寸、單一輸入 → 所有姿態與數值，不碰 three.js）→ 幾何（`update(input)`）→ stage（燈光、陰影、GTAO、bloom）→ console（1600×900 疊加面板、圖表、標註）→ film（`SCRIPT` + 純函數 `render(t)`）→ live（按鈕、滑桿、軌道相機；閒置 25 秒自動播導覽）→ score.py。
- 核心規則：從真實參考圖開始；真實數字只有一個來源；一個輸入驅動一切；正在工作的零件要能打開（隔離、剖面、X 光）；淺色攝影棚＋單一強調色；看截圖 contact sheet 反覆檢查。

## 套用到 iPhone Duo 的提案
- 單一輸入：`t ∈ [0,1]` 拆解進度（爆炸圖），另加 `hinge`（若 Duo 是折疊/雙螢幕）0–180°。
- 子系統按鈕：螢幕模組、鉸鏈、電池（雙電芯）、主機板（SoC/記憶體/基頻）、相機模組、Taptic Engine、喇叭、天線、散熱。
- 面板：每顆零件的尺寸、重量、容量（mAh/Wh）、BOM 估價，皆由同一份 `specs.js` 讀出。
- 拆解順序 = film 的 SCRIPT：加熱 → 撬開背蓋 → 拔排線 → 取電池 → 取主機板 → 鉸鏈。
- 先不做音效與影片，先做 live 頁；之後再錄片。
- 品牌：參考 repo 範例都用虛構型號；若要公開，建議頁面標示「概念/非官方」並避免使用 Apple 商標圖樣。

## 現況（2026-11-11）：live 頁第一版完成
- 原始碼在 `duo/`：`specs.js`（唯一數字來源：尺寸、20 個零件、13 個拆解步驟、9 個子系統）、`kin.js`（純數學：explode 0..1 ＋ 鉸鏈角度 → 姿態與讀數）、`model.js`（three.js 程式建模）、`tour.js`（自動導覽，`stateAt(t)` 純函數，約 72 秒）、`main.js`（舞台、面板、標註、操作）、`template.html`。
- 建置：`node build.mjs` → `dist/iphone-duo.html`（單檔離線，約 717 KB）。
- 截圖檢查：`LD_LIBRARY_PATH=$PWD/.localdeps/root/usr/lib/x86_64-linux-gnu node shot.mjs 1,9,30 [寬x高]` → `shots/`（頁面支援 `?t=秒` 渲染導覽單格）。
- Node 用 `~/.nvm/versions/node/v22.21.1`（系統 /usr/bin/node 太舊）。依賴借用 `reference-teardown/node_modules`（three、esbuild、playwright）。
- 參考 repo 自帶的 `sims/capture.mjs` 在自動模式下會被權限分類器擋下（外部程式碼），所以用自己的 `build.mjs`／`shot.mjs`。
- 尚未做：影片錄製與音效（film/score）、畫質分級（TIERS）、鉸鏈處內螢幕的彎曲段、真機參考圖比對。規格皆為概念設定，非官方數字。
- 2026-11-11 補：導覽結尾鏡頭原本 1.5 秒內反轉 180°，已改成同方向繞回起點（tour.js 最後四個 key）。已交付到 Library 的 iphone-duo.html 是修改前的版本，dist/ 內是新的。
- 2026-11-11 方向更新：使用者決定不做影片，只做互動 HTML。已補：鉸鏈處內螢幕與石墨片彎曲段（model.js 的 STRIPS）、點零件看規格、鉸鏈角度預設鈕、依幀時間自動降畫質（main.js 的 TIERS）。本機預覽：`./serve.sh` → http://localhost:8137/iphone-duo.html

## 2026-11-11 改為依真機資料（iPhone Duo 已於 2026-09 發表、10-23 開賣）
頁面上每個數字都帶來源標籤，定義在 `duo/specs.js` 的 `SRC`：官（Apple 規格頁）、拆（iFixit）、報（媒體）、推（本頁推定）。

來源：
- 官：https://www.apple.com/iphone-duo/specs/ （2026-11-11 讀取）。展開 164.6×117.8×5.2 mm、合起 84.1×117.8×11.3 mm、254 g；內 7.6″ 1878×2670 430ppi、外 5.4″ 1398×2034 460ppi、120 Hz、1000/1600/3000 nits；鈦金屬、背面 Ceramic Shield、外螢幕 Ceramic Shield 2；A20 Pro、C2、N1、儲存 256GB–2TB；48MP 主鏡頭 ƒ/1.6、48MP 超廣角 ƒ/2.2、12MP 2×、外前鏡頭 12MP ƒ/2.2、內螢幕下鏡頭 ƒ/1.8；側鍵 Touch ID、相機控制；雙電池、影片 44/31 小時、MagSafe/Qi2 25 W；IP68。
- 拆：https://www.ifixit.com/News/119895/iphone-duo-teardown （2026-10-25）。電池 7.5 Wh ＋ 11.6 Wh ＝ 19.1 Wh、電解離型膠、金屬殼；單層邏輯板＋I/O 板；充電線路只在一側；風琴式跨鉸鏈排線；鉸鏈為同步齒輪＋彈簧＋錶帶式關節＋中央支撐條；入口 Pentalobe 螺絲（四顆）；背蓋與外螢幕為卡扣＋螺絲＋膠封；3 個相機模組 4 顆鏡頭；暫定可修性 5/10；內螢幕換修 999 美元。
- 報：https://www.macrumors.com/roundup/iphone-duo/ （12 GB RAM、2 nm、均熱板、鈦鉸鏈 100+ 零件、碳纖維支撐板、磁鐵閉合、音量鍵在頂部、無動作按鈕、無 Face ID）；Digital Trends 轉述外流認證文件的 1,921 ＋ 2,962 mAh。
- 沒讀到的頁面：PhoneArena（403）、GSMArena 拆解新聞（402）、MacObserver（403）。

推定（兩個來源都沒寫）：各零件在哪一半與確切位置、相機高台與鏡頭排列、板上晶片排列、天線斷點、Taptic/揚聲器位置、所有零件的重量（估計值，總和調成官方 254 g）、圓角半徑、拆解步驟的先後順序（iFixit 沒有編號步驟）。
模型自洽檢查：`kin.envelope(0)` = 84.1×11.3、`envelope(180)` = 164.6×5.2，與官方一致（由 BODY.gap 0.9、BODY.spine 1.8 推得）。

## 2026-11-11 專案獨立並部署
- 相依套件改由本專案自己的 `package.json` 安裝，不再借用 `reference-teardown/node_modules`；上面提到 `dist/iphone-duo.html` 的地方，現在的輸出是 `docs/index.html`。
- 部署：GitHub Pages 由 `main` 分支的 `/docs` 提供，網址 https://frankkiv.github.io/DUO-teardown/
- 完整流程寫在 `.claude/skills/interactive-teardown/SKILL.md`。
