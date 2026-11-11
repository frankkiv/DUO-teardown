# DUO-teardown

iPhone Duo 的互動 3D 拆解模型，一個可離線開啟的 HTML 頁面。

**線上版：<https://frankkiv.github.io/DUO-teardown/>**

> 這是愛好者製作的**非官方**模型，與 Apple、iFixit 無關，也未經其認可。iPhone 是 Apple Inc. 的商標。
> 外觀尺寸與規格取自公開資料；機身內部的零件位置與重量有一部分是推定，頁面上都有標示。

## 可以做什麼

- 拖曳旋轉、滾輪縮放；「拆解進度」滑桿依 14 個步驟把 28 個零件逐一拆開；「鉸鏈角度」滑桿從合起到攤平，內螢幕會跟著彎曲。
- 10 個子系統按鈕（螢幕、鉸鏈、電池、主機板、相機、Taptic Engine、揚聲器、天線、散熱、按鍵）：隔離該系統、標註零件、顯示規格。
- 點任一零件看尺寸、重量與所屬步驟；「透視外殼」直接看內部。
- 不操作時自動導覽，任何輸入即可接手，閒置 25 秒後恢復。
- 鍵盤：`1`–`0` 選系統、`←` `→` 逐步拆、`F` 開合、`E` 全拆、`X` 透視、空白鍵導覽、`Esc` 取消選取。

## 數字從哪來

頁面上每個數字後面都有一個來源小標：

| 小標 | 意義 | 來源 |
|---|---|---|
| 官 | Apple 官方 | [Apple iPhone Duo 規格頁](https://www.apple.com/iphone-duo/specs/)（2026-11-11 讀取） |
| 拆 | 實拆 | [iFixit iPhone Duo Teardown](https://www.ifixit.com/News/119895/iphone-duo-teardown)（2026-10-25） |
| 報 | 媒體報導 | [MacRumors roundup](https://www.macrumors.com/roundup/iphone-duo/)、Digital Trends 轉述的外流認證文件 |
| 推 | 本頁推定 | 兩個來源都沒寫的部分 |

**屬於推定的項目**：各零件在哪一半與確切位置、相機高台上的鏡頭排列、板上晶片排列、天線斷點、Taptic Engine 與揚聲器位置、所有零件的重量（估計值，總和調成官方的 254 g）、拆解步驟的先後順序（iFixit 沒有編號步驟）。

模型的自我檢查：由鉸鏈幾何算出的合起尺寸為 84.1 × 11.3 mm、展開為 164.6 × 5.2 mm，與官方數字一致。完整的來源對照在 [NOTES.md](NOTES.md)。

## 本機執行

需要 Node 18 以上與 Python 3。

```bash
npm install
./serve.sh          # 建置並開在 http://localhost:8137/
# 或只建置：
node build.mjs      # → docs/index.html
```

截圖檢查（選用）：

```bash
npx playwright install chromium
node shot.mjs 1,6.5,28,56 1440x810    # → shots/，數字是自動導覽的秒數
```

## 專案結構

| 路徑 | 內容 |
|---|---|
| `duo/specs.js` | 唯一的數字來源：尺寸、28 個零件、14 個步驟、10 個系統，每個數字帶來源標籤 |
| `duo/kin.js` | 純數學：拆解進度與鉸鏈角度 → 姿態與讀數 |
| `duo/model.js` | 用 three.js 以程式建模，`update(e, openDeg)` 擺姿勢 |
| `duo/tour.js` | 自動導覽，`stateAt(t)` 是時間的純函數 |
| `duo/main.js`、`duo/template.html` | 舞台、面板、標註、操作 |
| `build.mjs`、`shot.mjs`、`serve.sh` | 建置、截圖、本機預覽 |
| `docs/index.html` | 建置結果，GitHub Pages 直接提供這個檔案 |
| `.claude/skills/interactive-teardown/SKILL.md` | 完整製作流程，給 AI agent（或人）照著為其他物品重做一次 |

## 想為別的物品做一個

請 agent 讀 [`.claude/skills/interactive-teardown/SKILL.md`](.claude/skills/interactive-teardown/SKILL.md)。在這個 repo 裡使用 Claude Code 時它會自動成為可用的 skill；也可以把該資料夾複製到其他專案的 `.claude/skills/`。

## 致謝與授權

成品頁面內嵌了以下開源元件：

- [three.js](https://threejs.org)，MIT License
- [Inter](https://rsms.me/inter/) 與 [JetBrains Mono](https://www.jetbrains.com/lp/mono/) 字型，SIL Open Font License 1.1

開發工具：[esbuild](https://esbuild.github.io)（MIT）、[Playwright](https://playwright.dev)（Apache-2.0）。

製作流程的靈感來自 [elvarofficial/teardown](https://github.com/elvarofficial/teardown)（MIT）。本 repo 沒有包含它的程式碼。
