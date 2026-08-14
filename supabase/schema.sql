-- ============================================================
-- 環保餐具地圖 — Supabase schema
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
  notes               text,
  created_at          timestamptz not null default now()
);

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

-- 刻意不設 update/delete 政策：
-- RLS 啟用後，沒有對應政策的操作一律被拒絕（包含 anon 和 authenticated），
-- 這樣就沒有人能透過網站竄改或刪除既有資料，防止惡意塗改。
