// 管理員後台頁面邏輯：登入 → 確認是不是管理員 → 顯示回報清單／所有店家 →
// 標記已處理、編輯店名/地址、編輯或刪除單筆評論、刪除整家店。
// 用到的 Supabase 讀寫都定義在 db.js（signInAdmin、checkIsAdmin、fetchReportsWithRestaurant...）。
// CHECKLIST_FIELDS 定義在 aggregate.js（跟主站共用同一份定義）。

const REPORT_TYPE_LABELS = {
  wrong_info: '資料有誤',
  delete_request: '想要刪除這家店',
  other: '其他',
};

let allRestaurantsCache = []; // 「所有店家」分頁最近一次抓到的資料，搜尋框用來做前端篩選

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('denied-logout-btn').addEventListener('click', handleLogout);
  document.getElementById('restaurant-search-input').addEventListener('input', renderRestaurantsList);
  document.getElementById('edit-restaurant-form').addEventListener('submit', handleEditRestaurantFormSubmit);
  document.getElementById('close-edit-restaurant-modal-btn').addEventListener('click', closeEditRestaurantModal);
  await checkSessionAndRender();
});

function showSection(name) {
  document.getElementById('login-section').classList.toggle('hidden', name !== 'login');
  document.getElementById('denied-section').classList.toggle('hidden', name !== 'denied');
  document.getElementById('dashboard-section').classList.toggle('hidden', name !== 'dashboard');
}

async function checkSessionAndRender() {
  const userId = await getCurrentUserId();
  if (!userId) {
    showSection('login');
    return;
  }
  const isAdmin = await checkIsAdmin(userId);
  if (!isAdmin) {
    showSection('denied');
    return;
  }
  showSection('dashboard');
  await loadReports();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.elements['email'].value.trim();
  const password = form.elements['password'].value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await signInAdmin(email, password);
    await checkSessionAndRender();
  } catch (err) {
    console.error(err);
    errorEl.textContent = '登入失敗，請確認帳號密碼是否正確。';
  } finally {
    btn.disabled = false;
  }
}

async function handleLogout() {
  await signOutAdmin();
  showSection('login');
}

// ---- 分頁切換：待處理回報 / 所有店家 ----
function switchAdminTab(name) {
  document.getElementById('tab-reports-btn').classList.toggle('active', name === 'reports');
  document.getElementById('tab-restaurants-btn').classList.toggle('active', name === 'restaurants');
  document.getElementById('tab-reports').classList.toggle('hidden', name !== 'reports');
  document.getElementById('tab-restaurants').classList.toggle('hidden', name !== 'restaurants');
  if (name === 'restaurants' && allRestaurantsCache.length === 0) {
    loadRestaurants();
  }
}

function escapeHtmlAdmin(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// ---- 待處理回報 ----
async function loadReports() {
  const listEl = document.getElementById('reports-list');
  listEl.innerHTML = '<p>載入中…</p>';
  try {
    const reports = await fetchReportsWithRestaurant();
    if (reports.length === 0) {
      listEl.innerHTML = '<p>目前沒有任何回報。</p>';
      return;
    }
    listEl.innerHTML = reports.map(buildReportCardHtml).join('');
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p>載入回報失敗，請重新整理頁面再試一次。</p>';
  }
}

function buildReportCardHtml(report) {
  const restaurant = report.restaurants;
  const restaurantName = restaurant ? restaurant.name : '（餐廳已被刪除）';
  const typeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;
  const statusLabel = report.status === 'open' ? '待處理' : '已處理';
  const createdAt = new Date(report.created_at).toLocaleString('zh-TW');

  return `
    <div class="report-card ${report.status === 'resolved' ? 'resolved' : ''}">
      <div class="report-card-header">
        <strong>${escapeHtmlAdmin(restaurantName)}</strong>
        <span class="report-status-badge">${statusLabel}</span>
      </div>
      ${restaurant && restaurant.address ? `<p class="report-address">${escapeHtmlAdmin(restaurant.address)}</p>` : ''}
      <p>類型：${typeLabel}</p>
      ${report.message ? `<p>留言：${escapeHtmlAdmin(report.message)}</p>` : ''}
      <p class="report-time">${createdAt}</p>
      <div class="report-actions">
        ${restaurant ? `<a class="btn-secondary" href="index.html?focus=${restaurant.id}" target="_blank" rel="noopener noreferrer">在地圖上看</a>` : ''}
        ${restaurant ? `<button type="button" class="btn-secondary" onclick="openEditRestaurantModal(${restaurant.id})">編輯資料</button>` : ''}
        ${report.status === 'open' ? `<button type="button" class="btn-secondary" onclick="handleResolveReport(${report.id})">標記已處理</button>` : ''}
        ${restaurant ? `<button type="button" class="btn-danger" onclick="handleDeleteRestaurant(${restaurant.id})">刪除這家店</button>` : ''}
      </div>
    </div>
  `;
}

async function handleResolveReport(reportId) {
  try {
    await resolveReport(reportId);
    await loadReports();
  } catch (err) {
    console.error(err);
    alert('操作失敗，請稍後再試一次。');
  }
}

async function handleDeleteRestaurant(restaurantId) {
  if (!confirm('確定要刪除這家店嗎？連同所有評論和回報都會一起刪除，這個操作沒辦法復原。')) return;
  try {
    await deleteRestaurantAsAdmin(restaurantId);
    closeEditRestaurantModal();
    await loadReports();
    if (!document.getElementById('tab-restaurants').classList.contains('hidden')) {
      await loadRestaurants();
    }
  } catch (err) {
    console.error(err);
    alert('刪除失敗，請稍後再試一次。');
  }
}

// ---- 所有店家 ----
async function loadRestaurants() {
  const listEl = document.getElementById('restaurants-list');
  listEl.innerHTML = '<p>載入中…</p>';
  try {
    allRestaurantsCache = await fetchAllRestaurantsForAdmin();
    renderRestaurantsList();
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p>載入店家失敗，請重新整理頁面再試一次。</p>';
  }
}

function renderRestaurantsList() {
  const listEl = document.getElementById('restaurants-list');
  const keyword = document.getElementById('restaurant-search-input').value.trim().toLowerCase();
  const filtered = keyword
    ? allRestaurantsCache.filter((r) => r.name.toLowerCase().includes(keyword))
    : allRestaurantsCache;

  if (filtered.length === 0) {
    listEl.innerHTML = '<p>沒有符合的店家。</p>';
    return;
  }
  listEl.innerHTML = filtered.map(buildRestaurantCardHtml).join('');
}

function buildRestaurantCardHtml(restaurant) {
  const agg = computeAggregate(restaurant.reviews || []);
  const statLine = CHECKLIST_FIELDS.map((field) => `${field.label} ${getFieldVerdict(agg.byField[field.key]).icon}`).join('　');

  return `
    <div class="report-card">
      <div class="report-card-header">
        <strong>${escapeHtmlAdmin(restaurant.name)}</strong>
        <span class="report-status-badge">共 ${agg.total} 筆評論</span>
      </div>
      ${restaurant.address ? `<p class="report-address">${escapeHtmlAdmin(restaurant.address)}</p>` : ''}
      <p class="report-time">${statLine}</p>
      <div class="report-actions">
        <a class="btn-secondary" href="index.html?focus=${restaurant.id}" target="_blank" rel="noopener noreferrer">在地圖上看</a>
        <button type="button" class="btn-secondary" onclick="openEditRestaurantModal(${restaurant.id})">編輯資料</button>
        <button type="button" class="btn-danger" onclick="handleDeleteRestaurant(${restaurant.id})">刪除這家店</button>
      </div>
    </div>
  `;
}

// ---- 編輯店家 modal（店名/地址 + 底下每一筆評論） ----
async function openEditRestaurantModal(restaurantId) {
  const modal = document.getElementById('edit-restaurant-modal');
  const reviewsEl = document.getElementById('edit-restaurant-reviews');
  modal.classList.add('open');
  reviewsEl.innerHTML = '<p>載入中…</p>';
  try {
    const restaurant = await fetchRestaurantForAdmin(restaurantId);
    const form = document.getElementById('edit-restaurant-form');
    form.elements['id'].value = restaurant.id;
    form.elements['name'].value = restaurant.name;
    form.elements['address'].value = restaurant.address || '';
    renderEditableReviews(restaurant.reviews || []);
  } catch (err) {
    console.error(err);
    reviewsEl.innerHTML = '<p>載入失敗，請關閉重試一次。</p>';
  }
}

function closeEditRestaurantModal() {
  document.getElementById('edit-restaurant-modal').classList.remove('open');
}

async function handleEditRestaurantFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const id = Number(form.elements['id'].value);
  const name = form.elements['name'].value.trim();
  const address = form.elements['address'].value.trim();
  if (!name) {
    alert('店名不能空白');
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await updateRestaurantAsAdmin(id, { name, address });
    await Promise.all([loadReports(), allRestaurantsCache.length ? loadRestaurants() : Promise.resolve()]);
    alert('已儲存');
  } catch (err) {
    console.error(err);
    alert('儲存失敗，請稍後再試一次。');
  } finally {
    btn.disabled = false;
  }
}

function renderEditableReviews(reviews) {
  const reviewsEl = document.getElementById('edit-restaurant-reviews');
  if (reviews.length === 0) {
    reviewsEl.innerHTML = '<p>這家店還沒有任何評論。</p>';
    return;
  }
  reviewsEl.innerHTML = reviews.map(buildEditableReviewRowHtml).join('');
}

function buildEditableReviewRowHtml(review) {
  const fieldsHtml = CHECKLIST_FIELDS.map(
    (field) => `
      <label class="admin-review-field">
        ${field.label}
        <select data-review-id="${review.id}" data-field="${field.key}">
          <option value="yes" ${review[field.key] === 'yes' ? 'selected' : ''}>有提供</option>
          <option value="no" ${review[field.key] === 'no' ? 'selected' : ''}>沒有提供</option>
          <option value="unknown" ${review[field.key] === 'unknown' ? 'selected' : ''}>不確定</option>
        </select>
      </label>
    `
  ).join('');

  return `
    <div class="admin-review-row" id="review-row-${review.id}">
      <div class="admin-review-fields">${fieldsHtml}</div>
      ${review.notes ? `<p class="review-notes">備註：${escapeHtmlAdmin(review.notes)}</p>` : ''}
      <p class="report-time">${new Date(review.created_at).toLocaleString('zh-TW')}</p>
      <div class="report-actions">
        <button type="button" class="btn-secondary" onclick="handleSaveReview(${review.id})">儲存這筆</button>
        <button type="button" class="btn-danger" onclick="handleDeleteReview(${review.id})">刪除這筆</button>
      </div>
    </div>
  `;
}

async function handleSaveReview(reviewId) {
  const row = document.getElementById(`review-row-${reviewId}`);
  const values = {};
  row.querySelectorAll('select[data-field]').forEach((select) => {
    values[select.dataset.field] = select.value;
  });
  try {
    await updateReviewAsAdmin(reviewId, values);
    alert('已儲存這筆評論');
  } catch (err) {
    console.error(err);
    alert('儲存失敗，請稍後再試一次。');
  }
}

async function handleDeleteReview(reviewId) {
  if (!confirm('確定要刪除這筆評論嗎？這個操作沒辦法復原。')) return;
  try {
    await deleteReviewAsAdmin(reviewId);
    document.getElementById(`review-row-${reviewId}`).remove();
  } catch (err) {
    console.error(err);
    alert('刪除失敗，請稍後再試一次。');
  }
}
