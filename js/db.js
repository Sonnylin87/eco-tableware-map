// 所有跟 Supabase 溝通的程式碼集中在這個檔案。
// supabaseClient 用 config.js 裡的 URL / anon key 建立。

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 一次把所有餐廳，連同各自的評論一起抓回來（用 PostgREST 的 foreign-key
// embedding，避免對每間餐廳各發一次「抓評論」的請求）。
async function fetchRestaurantsWithReviews() {
  const { data, error } = await supabaseClient
    .from('restaurants')
    .select('id, name, address, lat, lng, reviews(reusable_tableware, reusable_cup)');
  if (error) throw error;
  return data;
}

// 新增一間餐廳，回傳包含資料庫產生的 id 的完整資料列。
async function insertRestaurant({ name, address, lat, lng }) {
  const { data, error } = await supabaseClient
    .from('restaurants')
    .insert([{ name, address: address || null, lat, lng }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 新增一筆評論（表格式勾選）。
async function insertReview({ restaurant_id, reusable_tableware, reusable_cup, notes }) {
  const { error } = await supabaseClient
    .from('reviews')
    .insert([{ restaurant_id, reusable_tableware, reusable_cup, notes: notes || null }]);
  if (error) throw error;
}
