---
name: interactive-teardown
description: 把一個真實物品（手機、相機、耳機、遊戲機、家電…）做成「單一離線 HTML 的互動 3D 拆解模型」：可旋轉、逐步拆解、每個子系統一顆按鈕、每個數字都標來源，並可部署到 GitHub Pages。當使用者說「幫我做 X 的拆解頁」「做一個可以互動的 3D 爆炸圖」「像 DUO-teardown 那樣做一個 Y」時使用。
---

# 互動拆解頁：從查資料到上線的完整流程

這份文件記錄了 iPhone Duo 拆解頁（本 repo）實際走過的流程、踩過的坑和最後定下來的做法。
照著做，換一個物品也能重現。**本 repo 就是範本**：新物品請複製 `duo/`、`build.mjs`、`shot.mjs`、`serve.sh`、`package.json` 再改。

成品的樣子：一個約 700 KB 的 `docs/index.html`，three.js 與字型全部內嵌，雙擊就能開，也能直接放 GitHub Pages。

## 0. 原則（先讀這段，後面都是它的展開）

1. **先查資料，再建模。** 沒有來源的機器會做成「看起來像」的泛用模型。第一版我們照想像做，查完資料後幾乎全部重做（比例、鏡頭數、電池、解鎖方式都錯）。
2. **數字只有一個來源檔，而且每個數字都帶出處。** 幾何、面板、導覽字幕都讀同一份 `specs.js`。
3. **少數幾個輸入驅動一切。** 本例是「拆解進度 0..1」和「鉸鏈角度」。沒有任何手調的關鍵影格。
4. **自己看截圖驗收。** 你看不到動畫，但看得到截圖。每一輪修改後都要截圖讀過才能說「好了」。
5. **誠實標示。** 頁面必須寫明非官方，並區分「官方／實拆／報導／推定」。

## 1. 環境

```bash
node -v            # 需要 18 以上。WSL 內建的 /usr/bin/node 可能是 v12，請用 nvm 的版本
npm install        # three、esbuild、playwright、兩套字型
npx playwright install chromium   # 只有截圖檢查需要
```

- 沒有 sudo 又缺系統函式庫（Chromium 啟動時報 `libnss3.so` 之類）：用 `apt-get download libnss3 libnspr4` 抓 .deb，`dpkg -x` 解到專案內的 `.localdeps/root`，執行時加 `LD_LIBRARY_PATH=$PWD/.localdeps/root/usr/lib/x86_64-linux-gnu`。中文字型（`fonts-noto-cjk`）同樣處理，否則截圖裡中文會是方塊。
- 無頭環境沒有 GPU：截圖腳本用 `--use-angle=swiftshader --enable-unsafe-swiftshader` 軟體算圖。畫面正確，但**量不到真實幀率**，流暢度一定要請使用者在自己的機器上確認。

## 2. 查資料（最重要的一步）

依可信度由高到低找，並記下網址與讀取日期：

| 標籤 | 意義 | 例子 |
|---|---|---|
| `o` 官 | 製造商官方規格頁 | 尺寸、重量、螢幕、晶片、相機、續航 |
| `t` 拆 | 實際拆解（iFixit 等） | 電池 Wh、板子層數、鉸鏈機構、固定方式、拆解手法 |
| `r` 報 | 媒體報導、外流文件 | RAM、製程、官方頁沒列的材質 |
| `e` 推 | 自己的推定 | 零件在機身內的確切位置、零件重量、拆解先後 |

做法：

- 先搜尋產品是否**已經發表**。我們一開始以為是概念機，其實已上市且有 iFixit 拆解。
- 官方規格頁與拆解文章要**讀原文**（用 web-fetch），不要只看搜尋摘要；請它明確回報「沒找到」的項目，不要猜。
- 讀不到的頁面（403/402）記下來，不要假裝讀過。
- 把來源清單、每個來源提供了哪些數字、以及**哪些是推定**寫進 `NOTES.md`。
- 來源互相矛盾時以官方為準，並在筆記記下矛盾。

官方通常**不會**告訴你：各零件在哪個位置、零件重量、拆解順序。這些一律標 `e`，不要包裝成事實。

## 3. `specs.js`：唯一的數字來源

結構（見 `duo/specs.js`）：

- `SRC`：來源標籤的定義，頁面圖例與每一行規格後面的小標都讀它。
- `BODY`：外觀尺寸。註解寫出每個數字怎麼來的（例：`w: 82.3 // 展開寬 164.6 / 2 (o)`）。
- `PARTS`：每個零件一列：`id`、所屬系統 `sys`、在哪一半 `half`、厚度帶 `z0/z1`、佔位 `x/y/w/h`、估計重量 `mass`、爆炸位移 `out`、第幾步拆 `step`。
- `TEARDOWN`：拆解步驟的標題與說明（說明裡寫清楚哪句話出自誰）。
- `SYSTEMS`：每個子系統的面板內容，每行是 `[標籤, 值, 來源標籤]`。

要點：

- **零件重量是估計值**時，把總和調成官方總重，並在面板標「約」和 `推`。
- 用官方數字**反推**模型參數，再讓模型算回去驗證。本例：合起厚度 11.3 = 2 × 5.2 + 間隙 0.9；合起寬度 84.1 = 82.3 + 鉸鏈外凸 1.8。`kin.envelope(0)` 算出來必須等於官方值，這是最便宜的自我檢查。
- 排零件時逐一檢查佔位與厚度帶有沒有互相重疊。**碰撞用改數字解決，不要用鏡頭角度遮。**

## 4. `kin.js`：純數學

不 import three.js。輸入 → 所有姿態與讀數：

- `partProgress(e, step)`：每個步驟佔拆解進度的一段，零件依序飛出。
- `stepAt(e)`、`explodeFor(step)`：進度與步驟互換。
- `envelope(openDeg)`：整機外接尺寸與中心（面板讀數和置中都用它）。
- 會顯示在面板上、又能從零件加總的數字（電池 Wh、系統重量）在這裡加總，不要在別處另外寫死。

可以直接用 node 跑它來驗算，不需要瀏覽器。

## 5. `model.js`：用程式建模

- 單位用毫米，最外層 group 縮放成場景單位。
- 對稱的兩半只寫一次：一半放在 `scale.x = -1` 的 group 裡。three.js 會自動處理翻面，但**貼圖上的文字會鏡像**，UV 要用函式依「最後看得到的方向」算（見 `face()`）。
- 小工具就夠用：圓角矩形 `rrect` + `ExtrudeGeometry` 做板狀零件，`cylZ` 做鏡頭與螺絲，Canvas 貼圖做螢幕畫面與電池標籤。
- 每個零件的 mesh 用**自己的材質實例**並記下 `userData.part`，才能單獨淡化、上色、被點選。
- 可彎曲的東西（折疊螢幕、排線）用帶狀網格，每次 `update()` 依角度用 Hermite 曲線重算頂點（見 `poseStrip`）。
- `update(e, openDeg)` 是唯一擺姿勢的地方。

## 6. `tour.js`：自動導覽是時間的純函數

`stateAt(t)` 回傳 `{explode, open, 鏡頭方位/仰角/距離, focus, step, caption}`。關鍵影格由 `specs.js` 的步驟自動產生。
注意：**數值軌道只在「明確設定該欄位」的關鍵影格取點**，否則「停留」會被內插吃掉。鏡頭方位角用連續值（可超過 360），結尾要繞回與起點同餘，不要反轉。

頁面支援 `?t=秒數` 只畫導覽的某一格，截圖檢查全靠它。

## 7. `main.js` 與 `template.html`：舞台與操作

- 淺色攝影棚、單一強調色（代表「現在正在看的零件」）、一盞有陰影的主光 + `RoomEnvironment` 反射。
- 操作：兩個滑桿、上一步／下一步、每個系統一顆按鈕（按下：淡化其他零件、飛到預設視角、展開到該系統露出來的進度）、點零件看規格、透視外殼、鍵盤快捷鍵。
- 任何輸入都會接手；閒置 25 秒回到自動導覽。
- 手機版：直式是「上方精簡控制列＋底部可收合抽屜」（抽屜收合時只露出系統按鈕一列與目前標題，點把手或標題展開規格）；橫式是左右兩欄窄面板。
- **3D 要對準沒被面板蓋住的區域**：量出上下（或左右）面板之間的空白矩形，用 `camera.setViewOffset` 把投影中心移到那裡，再依空白區的高度與長寬比放大 FOV（見 `main.js` 的 `fitView`）。面板尺寸改變時用 `ResizeObserver` 標記重算。
- 頂部要有「非官方」標示與來源圖例。

## 8. 建置、預覽、截圖

```bash
node build.mjs                 # → docs/index.html（esbuild 打包 + 字型 base64 內嵌）
./serve.sh                     # 重新建置並在 http://localhost:8137/ 提供預覽（WSL 下 Windows 瀏覽器可直接開）
node shot.mjs 1,6.5,28,56 1440x810   # → shots/t-*.png，逐格截導覽畫面
node shot.mjs 30 390x844             # 手機寬度
```

背景伺服器請用 `setsid nohup ... &` 脫離，否則指令結束就被收掉。**不要用 `pkill -f` 配上會匹配到自己指令列的字串**，會把自己的 shell 一起殺掉。

互動功能（按鈕、點選）不會出現在 `?t=` 截圖裡，要另外寫 Playwright 腳本實際點擊再截圖。這一步不能省：我們的「透視外殼」壞過一次，就是因為只截了導覽畫面。

## 9. 驗收清單（每一輪都跑）

- [ ] `kin` 算出的外觀尺寸等於官方數字。
- [ ] 導覽每個步驟各截一張並讀過：零件有沒有穿模、標籤有沒有蓋住零件或被面板擋住、字有沒有被切掉。
- [ ] 合起、半開、攤平三種角度各一張。
- [ ] 每個系統按鈕、透視外殼、點選零件：實際點過並截圖。
- [ ] 手機直式與橫式各一張（用 Playwright 的 `devices['iPhone 13']`），並量測字幕、面板、空白區的位置沒有重疊；抽屜展開與收合都要點過。
- [ ] 瀏覽器 console 沒有錯誤。
- [ ] 面板上每個數字都有來源標籤，推定的寫了「約」或「模型中的位置」。
- [ ] 回報時明說哪些沒驗證（例如真實 GPU 上的幀率）。

## 10. 踩過的坑

| 現象 | 原因 | 解法 |
|---|---|---|
| 外框、螢幕邊緣閃爍 | 兩個面共平面（玻璃疊在邊框上、貼圖離機身只有 0.005 mm）造成 z-fighting | 玻璃嵌進框內不重疊；貼圖面抬高 0.06 mm；相機 near 拉遠（4）、far 拉近（300） |
| 透視／淡化沒效果，只變暗 | `MeshPhysicalMaterial` 在第一次渲染後才切換 `transparent`，需要 `needsUpdate` | 只在 `transparent` 狀態真的改變時設 `needsUpdate = true`（每幀都設會卡） |
| 每換一步卡一下 | 每次都對所有材質設 `needsUpdate` | 同上，只在需要時設 |
| 動畫不順 | 面板 `backdrop-filter: blur` 疊在 WebGL 上；每幀寫 DOM、讀 `offsetWidth` | 拿掉模糊；DOM 只在值改變時寫；量到的寬度快取 |
| 第一次轉到某角度會頓 | 著色器延遲編譯 | 開場 `renderer.compile(scene, camera)` |
| 手機上 3D 被上下面板擋住 | 面板蓋在全螢幕畫布上，鏡頭仍對準整個螢幕中心 | 精簡面板＋可收合抽屜；`setViewOffset` 把畫面中心移到空白區並依空白區調整 FOV |
| 筆電很慢 | 用到內顯、像素比 2 | `powerPreference: 'high-performance'`；像素比上限 1.5；依幀時間自動降級（`TIERS`） |
| 鏡像那一半的文字反了 | `scale.x = -1` | UV 依可見方向計算 |
| 導覽結尾鏡頭急甩 | 方位角 568 → 388 被當成反轉 180° | 用連續角度繞回起點 |
| 截圖裡中文是方塊 | 無頭環境沒有 CJK 字型 | 見第 1 節 |
| 無法執行外部 repo 的腳本 | 自動模式的權限分類器擋下第三方程式碼 | 自己寫 `build.mjs`／`shot.mjs`，只把第三方當 npm 相依套件 |

## 11. 部署到 GitHub Pages

建置結果直接提交在 `docs/`，Pages 設定為 `main` 分支的 `/docs`，不需要 CI。

```bash
node build.mjs && touch docs/.nojekyll
git add -A && git commit -m "..." && git push -u origin main
gh api -X POST repos/<owner>/<repo>/pages -f 'source[branch]=main' -f 'source[path]=/docs'   # 只需一次
gh api repos/<owner>/<repo>/pages --jq .html_url
```

不要提交：`node_modules/`、截圖、`.localdeps/`、`.claude/settings.json`、任何複製下來的第三方 repo。

## 12. 第三方元件與授權

| 元件 | 用途 | 授權 |
|---|---|---|
| [three.js](https://threejs.org) 0.186 | 3D 繪圖（含 OrbitControls、RoomEnvironment） | MIT |
| [esbuild](https://esbuild.github.io) | 把原始碼與 three.js 打包成一段 script | MIT |
| [Playwright](https://playwright.dev) + Chromium | 截圖檢查（不進成品） | Apache-2.0 |
| [Inter](https://rsms.me/inter/)（@fontsource-variable/inter） | 介面字型，內嵌在頁面 | SIL OFL 1.1 |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/)（@fontsource/jetbrains-mono） | 數字字型，內嵌在頁面 | SIL OFL 1.1 |

打包進成品的是 three.js 與兩套字型；MIT 與 OFL 都允許這樣散布，README 的致謝段落已列出。

**流程的靈感來源**：[elvarofficial/teardown](https://github.com/elvarofficial/teardown)（MIT），它提出「一台機器一個離線頁面、數字單一來源、單一輸入驅動、看截圖驗收」的做法。本 repo 的程式碼與這份文件都是自己寫的，沒有複製它的程式或文字；它另外涵蓋的逐格錄影與程序化配樂，本流程沒有做。

## 13. 換一個物品時的起手式

1. 問清楚：哪個產品、哪個型號、要不要部署、用什麼語言。
2. 做第 2 節的查資料，寫 `NOTES.md`。資料太少（沒有官方尺寸也沒有拆解）就先告訴使用者，請他決定要不要以「概念模型」繼續。
3. 複製範本，先改 `specs.js` 和 `kin.js`，用 node 驗算外觀尺寸。
4. 改 `model.js`：先外殼，再由外往內一層一層加，每加一層截圖一次。
5. 調 `tour.js` 的鏡頭，跑第 9 節的驗收清單。
6. 部署，回報時附上線上網址與仍屬推定的項目。
