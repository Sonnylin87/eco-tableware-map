-- ============================================================
-- 綠色生活餐廳地圖 — Supabase schema
-- 使用方式：Supabase Dashboard → SQL Editor → New query → 貼上整份檔案 → Run
-- ============================================================

-- 1. 餐廳 -------------------------------------------------------
create table if not exists restaurants (
  id          bigint generated always as identity primary key,
  name        text not null,
  address     text,
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);

-- 2. 評論（表格式勾選）--------------------------------------------
create table if not exists reviews (
  id                  bigint generated always as identity primary key,
  restaurant_id       bigint not null references restaurants(id) on delete cascade,
  reusable_tableware  text not null check (reusable_tableware in ('yes', 'no', 'unknown')),
  reusable_cup        text not null check (reusable_cup in ('yes', 'no', 'unknown')),
  reusable_bowl       text not null default 'unknown' check (reusable_bowl in ('yes', 'no', 'unknown')),
  reusable_plate      text not null default 'unknown' check (reusable_plate in ('yes', 'no', 'unknown')),
  provides_straw      text not null default 'unknown' check (provides_straw in ('yes', 'no', 'unknown')),
  notes               text,
  created_at          timestamptz not null default now()
);

-- 舊專案（第一版就已經跑過這份 schema）不會自動長出新欄位，
-- 這三行補齊 reusable_bowl / reusable_plate / provides_straw。
-- 用 if not exists，所以不管是全新專案還是舊專案，重複執行都安全。
alter table reviews add column if not exists reusable_bowl text not null default 'unknown' check (reusable_bowl in ('yes', 'no', 'unknown'));
alter table reviews add column if not exists reusable_plate text not null default 'unknown' check (reusable_plate in ('yes', 'no', 'unknown'));
alter table reviews add column if not exists provides_straw text not null default 'unknown' check (provides_straw in ('yes', 'no', 'unknown'));

-- 加速「抓某餐廳所有評論」的查詢（前端用 embedding 一次抓回來也會用到）
create index if not exists reviews_restaurant_id_idx on reviews (restaurant_id);

-- 3. Row Level Security --------------------------------------------
alter table restaurants enable row level security;
alter table reviews enable row level security;

-- 公開讀取（地圖不需要登入就能看）
-- 先 drop if exists 再 create，這樣整份檔案可以重複執行也不會報錯
-- （create policy 本身不支援 if not exists）
drop policy if exists "Public can read restaurants" on restaurants;
create policy "Public can read restaurants" on restaurants
  for select using (true);

drop policy if exists "Public can read reviews" on reviews;
create policy "Public can read reviews" on reviews
  for select using (true);

-- 公開新增（任何人都能新增餐廳 / 送出評論）
drop policy if exists "Public can add restaurants" on restaurants;
create policy "Public can add restaurants" on restaurants
  for insert with check (true);

drop policy if exists "Public can add reviews" on reviews;
create policy "Public can add reviews" on reviews
  for insert with check (true);

-- 沒有給 anon（一般訪客）update/delete 政策：
-- RLS 啟用後，沒有對應政策的操作一律被拒絕，一般人沒辦法透過網站
-- 竄改或刪除既有資料。下面會另外開放給「管理員」這個身份。

-- ============================================================
-- 4. 回報（資料有誤 / 想刪除店家）--------------------------------
-- ============================================================
create table if not exists reports (
  id             bigint generated always as identity primary key,
  restaurant_id  bigint not null references restaurants(id) on delete cascade,
  report_type    text not null check (report_type in ('wrong_info', 'delete_request', 'other')),
  message        text,
  status         text not null default 'open' check (status in ('open', 'resolved')),
  created_at     timestamptz not null default now()
);

create index if not exists reports_restaurant_id_idx on reports (restaurant_id);
create index if not exists reports_status_idx on reports (status);

alter table reports enable row level security;

-- 任何人都能送出回報，但看不到任何回報內容（包括自己送出的）——
-- 故意不給 anon select 政策，避免被拿來公開洗版特定店家。
drop policy if exists "Public can add reports" on reports;
create policy "Public can add reports" on reports
  for insert with check (true);

-- ============================================================
-- 5. 管理員名單 --------------------------------------------------
-- 這張表只記錄「哪些登入帳號是管理員」，不存密碼（密碼由 Supabase
-- Auth 自己管）。帳號本身要先在 Supabase Dashboard → Authentication
-- 手動建立，再把該帳號的 user_id 插進這張表，做法見 README.md。
-- ============================================================
create table if not exists admins (
  user_id  uuid primary key references auth.users(id) on delete cascade
);

alter table admins enable row level security;

-- 只能查自己是不是在名單裡（不能列出全部管理員）。
-- 這一條政策也是讓下面其他表的 exists(...) 判斷式能正常運作的關鍵：
-- RLS 政策查別的表時，那張表自己的 RLS 也會生效，如果 admins 表完全不給查，
-- 判斷式會永遠查不到東西、直接失效。
drop policy if exists "Users can check own admin status" on admins;
create policy "Users can check own admin status" on admins
  for select using (auth.uid() = user_id);

-- ============================================================
-- 6. 管理員專屬權限 ------------------------------------------------
-- 讓「登入且在 admins 名單裡」的帳號可以刪改資料，一般訪客（anon）
-- 完全不受影響，還是只能新增、不能改也不能刪。
-- ============================================================
drop policy if exists "Admins can update restaurants" on restaurants;
create policy "Admins can update restaurants" on restaurants
  for update using (exists (select 1 from admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can delete restaurants" on restaurants;
create policy "Admins can delete restaurants" on restaurants
  for delete using (exists (select 1 from admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can delete reviews" on reviews;
create policy "Admins can delete reviews" on reviews
  for delete using (exists (select 1 from admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can update reviews" on reviews;
create policy "Admins can update reviews" on reviews
  for update using (exists (select 1 from admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can read reports" on reports;
create policy "Admins can read reports" on reports
  for select using (exists (select 1 from admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can update reports" on reports;
create policy "Admins can update reports" on reports
  for update using (exists (select 1 from admins a where a.user_id = auth.uid()));
