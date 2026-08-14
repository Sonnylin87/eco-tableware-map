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

// 新增一筆回報（資料有誤 / 想刪除店家 / 其他）。任何人都能送出，
// 但送出後看不到任何回報內容——只有管理員能讀取，見 admin 專用函式。
async function insertReport({ restaurant_id, report_type, message }) {
  const { error } = await supabaseClient
    .from('reports')
    .insert([{ restaurant_id, report_type, message: message || null }]);
  if (error) throw error;
}

// ============================================================
// 管理員專用（需要先用 signInAdmin 登入，且帳號要在 admins 名單裡，
// 否則下面這些查詢會被 RLS 擋掉，回傳空結果或權限錯誤）
// ============================================================

async function signInAdmin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOutAdmin() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

// 回傳目前登入者的 user id，沒登入就回傳 null。
async function getCurrentUserId() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session ? data.session.user.id : null;
}

// 查自己是不是在 admins 名單裡。靠 admins 表的 RLS（只能查自己那一列）
// 來分辨「登入成功但不是管理員」跟「是管理員」。
async function checkIsAdmin(userId) {
  const { data, error } = await supabaseClient.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data !== null;
}

// 抓所有回報，連同對應的餐廳資訊一起帶出來，未處理的排前面。
async function fetchReportsWithRestaurant() {
  const { data, error } = await supabaseClient
    .from('reports')
    .select('id, report_type, message, status, created_at, restaurants(id, name, address, lat, lng)')
    .order('status', { ascending: true }) // 'open' 排在 'resolved' 前面（英文字母序）
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function resolveReport(reportId) {
  const { error } = await supabaseClient.from('reports').update({ status: 'resolved' }).eq('id', reportId);
  if (error) throw error;
}

async function deleteRestaurantAsAdmin(restaurantId) {
  const { error } = await supabaseClient.from('restaurants').delete().eq('id', restaurantId);
  if (error) throw error;
}

// 抓所有餐廳，連同每筆評論的完整內容（含 id、備註、時間），管理員瀏覽/編輯用。
// 一般使用者用的 fetchRestaurantsWithReviews 不帶這些，只帶統計要用的欄位。
async function fetchAllRestaurantsForAdmin() {
  const reviewFields = CHECKLIST_FIELDS.map((field) => field.key).join(', ');
  const { data, error } = await supabaseClient
    .from('restaurants')
    .select(`id, name, address, lat, lng, reviews(id, notes, created_at, ${reviewFields})`)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

// 抓單一餐廳的完整資料（含每筆評論的 id、備註），編輯視窗開啟時用。
async function fetchRestaurantForAdmin(restaurantId) {
  const reviewFields = CHECKLIST_FIELDS.map((field) => field.key).join(', ');
  const { data, error } = await supabaseClient
    .from('restaurants')
    .select(`id, name, address, lat, lng, reviews(id, notes, created_at, ${reviewFields})`)
    .eq('id', restaurantId)
    .single();
  if (error) throw error;
  return data;
}

async function updateRestaurantAsAdmin(restaurantId, { name, address }) {
  const { error } = await supabaseClient
    .from('restaurants')
    .update({ name, address: address || null })
    .eq('id', restaurantId);
  if (error) throw error;
}

// values 是 { [CHECKLIST_FIELDS 的 key]: 'yes'|'no'|'unknown' } 這種物件。
async function updateReviewAsAdmin(reviewId, values) {
  const { error } = await supabaseClient.from('reviews').update(values).eq('id', reviewId);
  if (error) throw error;
}

async function deleteReviewAsAdmin(reviewId) {
  const { error } = await supabaseClient.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}
