# 綠色生活餐廳地圖

一個群眾協作的地圖網站：任何拿到連結的人都能在地圖上標記餐廳，並用「表格式」評論勾選這家餐廳是否提供環保餐具、環保杯、環保碗、環保盤。不需要登入。所有勾選項目定義在 `js/aggregate.js` 的 `CHECKLIST_FIELDS`，要再新增項目只要改那裡（同時記得在 `supabase/schema.sql` 加對應欄位）。

- 地圖：OpenStreetMap + Leaflet.js
- 地址查詢/定位：Nominatim（OpenStreetMap 的免費地址查詢）+ 瀏覽器內建 Geolocation API
- 資料庫：Supabase（Postgres + 自動產生的 REST API），管理員登入用 Supabase Auth
- 前端：純 HTML/CSS/JS，沒有建置流程

## 1. 設定 Supabase

1. 到 [supabase.com](https://supabase.com) 建立一個免費專案（Region 建議選離台灣近的，例如 Singapore）。
2. 左側選單 → **SQL Editor** → New query，貼上 `supabase/schema.sql` 的全部內容 → 按 Run。
   這會建立 `restaurants`、`reviews`、`reports`、`admins` 四張表，並設定好權限規則：任何人都能新增餐廳/評論/回報、都能讀取餐廳與評論，但只有「登入且在 `admins` 名單裡」的帳號才能修改或刪除資料、讀取回報內容。這份 SQL 可以重複貼上執行，不會報錯。
3. 左側選單 → **Project Settings → API**，複製：
   - Project URL
   - Publishable key（新版介面）或 anon public key（舊版介面）
4. 打開 `js/config.js`，把這兩個值貼進去取代 `YOUR-PROJECT` / `YOUR-ANON-PUBLIC-KEY`。

## 2. 設定管理員帳號（處理回報、刪除店家用）

1. Supabase Dashboard → **Authentication → Users → Add user**。
   - 填自己的 email 和一組密碼。
   - 記得勾選 **Auto Confirm User**（這個網站沒有另外設定寄信驗證，不勾的話會卡在「等待驗證信」）。
2. 回到 **SQL Editor**，執行下面這一行，把剛剛建立的帳號加進管理員名單（`your-email@example.com` 換成你剛剛填的 email）：
   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'your-email@example.com'
   on conflict do nothing;
   ```
3. 打開網站的 `admin.html`（例如 `https://你的網址/admin.html`），用剛剛的 email/密碼登入，應該會看到「待處理回報」清單（一開始通常是空的）。
4. 之後要再加別的管理員，重複步驟 1-2 即可，`admins` 表可以放多筆。

## 3. 本機測試

不需要安裝任何東西即可先用瀏覽器直接開啟 `index.html` 做基本檢查，但建議用一個簡單的本機伺服器，體驗會更接近正式上線（定位功能在 `http://localhost` 也能正常運作，瀏覽器把 localhost 當成安全來源）：

```powershell
# 兩種方式擇一，在專案資料夾下執行
npx serve .
# 或
python -m http.server 8000
```

打開瀏覽器連到終端機顯示的網址（例如 `http://localhost:3000` 或 `http://localhost:8000`）。

**檢查清單：**
1. 地圖有正確置中在台灣、圖磚正常顯示，瀏覽器 console（F12）沒有紅字錯誤。
2. 按「新增店家」→ 三種方式都測一次：點地圖上任一位置 / 輸入地址搜尋 / 使用我目前的位置 → 填店名 + 勾選項目 → 送出 → 畫面立刻出現新的彩色標記。
3. 按「📍 定位我」，允許瀏覽器的定位權限，確認地圖移動到目前位置並出現藍色圓點。
4. 到 Supabase 的 **Table Editor**，確認 `restaurants` 和 `reviews` 都新增了對應的資料列。
5. 點剛新增的標記 → 彈出視窗顯示每個項目的多數決結果（例如「環保餐具：✅ 有提供」）、「🧭 導航」「填寫評論」「⚠️ 回報問題」三個按鈕都在。
6. 點「回報問題」送出一筆回報，到 `admin.html` 登入後確認看得到；再用一般瀏覽器（沒登入）直接打 API 查 `reports` 表，確認會被擋掉、看不到內容。
7. 在 `admin.html` 測「標記已處理」和「刪除這家店」，確認 Table Editor 裡的資料有對應變化（刪除餐廳要連 reviews/reports 一起消失）。
7b. 點「編輯資料」，改店名/地址存檔，也試著把某一筆評論的勾選值改掉再按「儲存這筆」，確認地圖上那家店的彈出視窗內容有跟著更新（回主頁重新整理一次）。
8. 整頁重新整理，確認資料還在（代表是真的存在 Supabase，不是只存在瀏覽器裡）。

## 4. 部署到 Vercel

1. 把整個資料夾推到 GitHub repo（或不使用 GitHub，直接在資料夾內執行 `vercel` CLI 部署）。
2. Vercel → **Add New Project** → 匯入這個 repo。
3. Framework Preset 選 **Other**，Build Command 留空，Output Directory 設為專案根目錄（`./`）。
4. Deploy。因為是純靜態網站，Vercel 不會執行任何建置步驟，直接把檔案原封不動發佈出去。
5. 不需要在 Vercel 額外設定環境變數——`js/config.js` 裡的 Supabase URL / anon key 本來就是設計成公開的，真正的存取控制是靠 `supabase/schema.sql` 裡的 Row Level Security 規則。
6. 定位功能需要 HTTPS 才能用（`http://` 的正式網址會被瀏覽器擋掉），Vercel 預設就是 HTTPS，不用額外設定。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `index.html` | 主頁骨架：地圖容器 + 新增店家/評論/回報表單 modal |
| `admin.html` | 管理員後台頁面（登入 + 回報清單 + 所有店家瀏覽/編輯） |
| `css/style.css` | 版面、標記顏色、modal、管理員頁面樣式 |
| `js/config.js` | Supabase URL / anon key（需自行填入） |
| `js/db.js` | 所有跟 Supabase 讀寫資料的程式碼，含管理員專用函式 |
| `js/aggregate.js` | 統計每家餐廳的評論、決定標記顏色、決定多數決結論 |
| `js/geocode.js` | 地址查詢（Nominatim），把地址文字轉成經緯度 |
| `js/geolocate.js` | 「定位我」功能，讀取瀏覽器目前位置 |
| `js/map.js` | Leaflet 地圖初始化、標記渲染、點地圖/輸入地址/用目前位置新增店家 |
| `js/ui.js` | 彈出視窗內容、評論/新增餐廳/回報三個表單 modal 的開關與送出邏輯 |
| `js/admin.js` | 管理員後台頁面邏輯 |
| `js/app.js` | 主頁進入點，把上面全部串起來，也處理從管理員後台跳轉過來的 `?focus=` 參數 |
| `supabase/schema.sql` | 資料表結構 + 權限規則，貼到 Supabase SQL Editor 執行 |

## 之後可以考慮加強的地方（目前故意先不做，保持簡單）

- 更完整的防濫用機制（目前只有一個基本的隱藏欄位 honeypot）
- 一般使用者的帳號登入、查看自己送出過的回報/評論紀錄
- 地址查詢結果不準時，讓使用者能拖曳標記微調位置（目前只能取消重點地圖）
