// 所有跟 Supabase 溝通的程式碼集中在這個檔案。
// supabaseClient 用 config.js 裡的 URL / anon key 建立。

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// PostgREST（Supabase 的自動 API）單次查詢預設最多回傳 1000 筆，
// 就算把 Supabase 後台的 Max Rows 設定調高，也只是把門檻往後延，
// 餐廳數量早晚還是會超過那個數字。真正的解法是分頁：一頁一頁抓，
// 直到抓到不滿一頁的資料（代表已經是最後一頁）為止，這樣不管
// 餐廳有幾百還是幾萬筆都能一次抓齊，不用管後台設定是多少。
const FETCH_PAGE_SIZE = 1000;

// buildQuery 是一個「不帶 .range() 的查詢」建構函式，每一頁都要重新呼叫一次
// 建出一份新的 query（Supabase 的 query builder 只能用一次，不能重複 await）。
async function fetchAllPages(buildQuery) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < FETCH_PAGE_SIZE) break; // 不滿一頁，代表這是最後一頁
    from += FETCH_PAGE_SIZE;
  }
  return rows;
}

// 把所有餐廳，連同各自的評論一起抓回來（用 PostgREST 的 foreign-key
// embedding，避免對每間餐廳各發一次「抓評論」的請求）。
// 依 id 排序只是為了讓分頁時每一頁的範圍是穩定的（不排序的話，Postgres
// 不保證每次查詢順序一樣，分頁時可能重複或漏抓），跟畫面顯示順序無關。
async function fetchRestaurantsWithReviews() {
  const reviewFields = CHECKLIST_FIELDS.map((field) => field.key).join(', ');
  // notes、created_at 是給地圖 popup 顯示「大家的備註」用的（見 aggregate.js 的 getVisibleNotes）。
  return fetchAllPages(() =>
    supabaseClient
      .from('restaurants')
      .select(`id, name, address, lat, lng, map_type, phone, order_url, reviews(notes, created_at, ${reviewFields})`)
      .order('id', { ascending: true })
  );
}

// 新增一間餐廳，回傳包含資料庫產生的 id 的完整資料列。
// map_type：'eco'（主地圖）或 'catering'（企業訂餐地圖）；phone / order_url 只有企業訂餐會填，選填。
async function insertRestaurant({ name, address, lat, lng, map_type = 'eco', phone, order_url }) {
  const { data, error } = await supabaseClient
    .from('restaurants')
    .insert([{ name, address: address || null, lat, lng, map_type, phone: phone || null, order_url: order_url || null }])
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
// 一樣用 fetchAllPages 分頁抓（見上方說明），店名可能重複，多加 id 當第二排序
// 鍵確保每頁範圍穩定；抓齊之後才依店名排序好交給畫面顯示，跟分頁邏輯脫鉤。
async function fetchAllRestaurantsForAdmin() {
  const reviewFields = CHECKLIST_FIELDS.map((field) => field.key).join(', ');
  const rows = await fetchAllPages(() =>
    supabaseClient
      .from('restaurants')
      .select(`id, name, address, lat, lng, map_type, phone, order_url, reviews(id, notes, created_at, ${reviewFields})`)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
  );
  return rows;
}

// 抓單一餐廳的完整資料（含每筆評論的 id、備註），編輯視窗開啟時用。
async function fetchRestaurantForAdmin(restaurantId) {
  const reviewFields = CHECKLIST_FIELDS.map((field) => field.key).join(', ');
  const { data, error } = await supabaseClient
    .from('restaurants')
    .select(`id, name, address, lat, lng, map_type, phone, order_url, reviews(id, notes, created_at, ${reviewFields})`)
    .eq('id', restaurantId)
    .single();
  if (error) throw error;
  return data;
}

async function updateRestaurantAsAdmin(restaurantId, { name, address, phone, order_url }) {
  const { error } = await supabaseClient
    .from('restaurants')
    .update({ name, address: address || null, phone: phone || null, order_url: order_url || null })
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
