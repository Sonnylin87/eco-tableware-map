// 管理員後台頁面邏輯：登入 → 確認是不是管理員 → 顯示回報清單 → 標記已處理／刪除店家。
// 用到的 Supabase 讀寫都定義在 db.js（signInAdmin、checkIsAdmin、fetchReportsWithRestaurant...）。

const REPORT_TYPE_LABELS = {
  wrong_info: '資料有誤',
  delete_request: '想要刪除這家店',
  other: '其他',
};

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('denied-logout-btn').addEventListener('click', handleLogout);
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

function escapeHtmlAdmin(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
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
    await loadReports();
  } catch (err) {
    console.error(err);
    alert('刪除失敗，請稍後再試一次。');
  }
}
