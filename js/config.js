// 到 Supabase 專案的 Project Settings → API 頁面複製這兩個值貼進來。
// 這兩個值本來就是設計成公開的（不是密碼），實際的存取控制是靠
// supabase/schema.sql 裡的 Row Level Security 規則把關。
const SUPABASE_URL = 'https://mabuuluyeyrrcovmvhwu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V7161k-vzokIIrD8Pr-k5A_jsHY5yb6';
