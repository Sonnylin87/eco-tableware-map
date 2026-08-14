# 環保餐具地圖

一個群眾協作的地圖網站：任何拿到連結的人都能在地圖上標記餐廳，並用「表格式」評論勾選這家餐廳是否提供環保餐具、環保杯。不需要登入。

- 地圖：OpenStreetMap + Leaflet.js
- 資料庫：Supabase（Postgres + 自動產生的 REST API）
- 前端：純 HTML/CSS/JS，沒有建置流程

## 1. 設定 Supabase

1. 到 [supabase.com](https://supabase.com) 建立一個免費專案（Region 建議選離台灣近的，例如 Singapore）。
2. 左側選單 → **SQL Editor** → New query，貼上 `supabase/schema.sql` 的全部內容 → 按 Run。
   這會建立 `restaurants`、`reviews` 兩張表，並設定好權限規則（任何人都能新增/讀取，但沒有人能透過網站修改或刪除既有資料）。
3. 左側選單 → **Project Settings → API**，複製：
   - Project URL
   - anon public key
4. 打開 `js/config.js`，把這兩個值貼進去取代 `YOUR-PROJECT` / `YOUR-ANON-PUBLIC-KEY`。

## 2. 本機測試

不需要安裝任何東西即可先用瀏覽器直接開啟 `index.html` 做基本檢查，但建議用一個簡單的本機伺服器，體驗會更接近正式上線：

```powershell
# 兩種方式擇一，在專案資料夾下執行
npx serve .
# 或
python -m http.server 8000
```

打開瀏覽器連到終端機顯示的網址（例如 `http://localhost:3000` 或 `http://localhost:8000`）。

**檢查清單：**
1. 地圖有正確置中在台灣、圖磚正常顯示，瀏覽器 console（F12）沒有紅字錯誤。
2. 按「新增店家」→ 點地圖上任一位置 → 填店名 + 勾選環保餐具/環保杯 → 送出 → 畫面立刻出現新的彩色標記。
3. 到 Supabase 的 **Table Editor**，確認 `restaurants` 和 `reviews` 都新增了對應的資料列。
4. 點剛新增的標記 → 彈出視窗顯示統計數字（例如「環保餐具：1 有 / 0 無 / 0 不確定」）與「填寫評論」按鈕。
5. 對同一家餐廳再送出一筆不同答案的評論 → 統計數字更新、標記顏色跟著變化（綠＝多數回報有提供、紅＝多數回報沒有、黃＝平手或多為不確定、灰＝還沒人填過）。
6. 整頁重新整理，確認資料還在（代表是真的存在 Supabase，不是只存在瀏覽器裡）。

## 3. 部署到 Vercel

1. 把整個資料夾推到 GitHub repo（或不使用 GitHub，直接在資料夾內執行 `vercel` CLI 部署）。
2. Vercel → **Add New Project** → 匯入這個 repo。
3. Framework Preset 選 **Other**，Build Command 留空，Output Directory 設為專案根目錄（`./`）。
4. Deploy。因為是純靜態網站，Vercel 不會執行任何建置步驟，直接把檔案原封不動發佈出去。
5. 不需要在 Vercel 額外設定環境變數——`js/config.js` 裡的 Supabase URL / anon key 本來就是設計成公開的，真正的存取控制是靠 `supabase/schema.sql` 裡的 Row Level Security 規則。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `index.html` | 頁面骨架：地圖容器 + 兩個表單 modal |
| `css/style.css` | 版面、標記顏色、modal 樣式 |
| `js/config.js` | Supabase URL / anon key（需自行填入） |
| `js/db.js` | 所有跟 Supabase 讀寫資料的程式碼 |
| `js/aggregate.js` | 統計每家餐廳的評論、決定標記顏色 |
| `js/map.js` | Leaflet 地圖初始化、標記渲染、點地圖新增店家 |
| `js/ui.js` | 彈出視窗內容、兩個表單 modal 的開關與送出邏輯 |
| `js/app.js` | 進入點，把上面全部串起來 |
| `supabase/schema.sql` | 資料表結構 + 權限規則，貼到 Supabase SQL Editor 執行 |

## 之後可以考慮加強的地方（目前故意先不做，保持簡單）

- 依店名/地址在地圖上搜尋定位
- 更完整的防濫用機制（目前只有一個基本的隱藏欄位 honeypot）
- 帳號登入、我的回報紀錄
