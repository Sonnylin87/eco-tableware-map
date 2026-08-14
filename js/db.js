// 所有跟 Supabase 溝通的程式碼集中在這個檔案。
// supabaseClient 用 config.js 裡的 URL / anon key 建立。

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 一次把所有餐廳，連同各自的評論一起抓回來（用 PostgREST 的 foreign-key
// embedding，避免對每間餐廳各發一次「抓評論」的請求）。
async function fetchRestaurantsWithReviews() {
  const reviewFields = CHECKLIST_FIELDS.map((field) => field.key).join(', ');
  const { data, error } = await supabaseClient
    .from('restaurants')
    .select(`id, name, address, lat, lng, reviews(${reviewFields})`);
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
// review 除了 restaurant_id、notes 之外，要包含 CHECKLIST_FIELDS 裡每一項的值
// （例如 reusable_tableware、reusable_cup、reusable_bowl、reusable_plate、provides_straw）。
async function insertReview(review) {
  const { error } = await supabaseClient
    .from('reviews')
    .insert([{ ...review, notes: review.notes || null }]);
  if (error) throw error;
}
