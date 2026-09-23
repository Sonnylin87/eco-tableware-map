// 彈出視窗（popup）的 HTML 組裝，以及評論表單 / 新增餐廳表單這兩個 modal 的開關與送出邏輯。

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// 依 CHECKLIST_FIELDS 動態產生表單裡的勾選區塊，填進頁面上每個
// class="checklist-fieldsets" 的容器（評論表單、新增餐廳表單都用得到）。
// 這樣以後要再新增勾選項目，只要改 aggregate.js 的 CHECKLIST_FIELDS，
// 不用同時改好幾份重複的 HTML。
function renderChecklistFieldsets() {
  const html = CHECKLIST_FIELDS.map(
    (field) => `
      <fieldset>
        <legend>${escapeHtml(t('checklist_legend', { label: t('field_' + field.key) }))}</legend>
        <label><input type="radio" name="${field.key}" value="yes" required /> ${escapeHtml(t('checklist_yes'))}</label>
        <label><input type="radio" name="${field.key}" value="no" /> ${escapeHtml(t('checklist_no'))}</label>
        <label><input type="radio" name="${field.key}" value="unknown" /> ${escapeHtml(t('checklist_unknown'))}</label>
      </fieldset>
    `
  ).join('');
  document.querySelectorAll('.checklist-fieldsets').forEach((container) => {
    container.innerHTML = html;
  });
}

// 從表單裡讀出 CHECKLIST_FIELDS 定義的每一項勾選值，回傳 { key: value } 物件。
// 如果有項目沒選，回傳 null（呼叫端負責跳提示訊息）。
function readChecklistFromForm(form) {
  const result = {};
  for (const field of CHECKLIST_FIELDS) {
    const value = form.elements[field.key].value;
    if (!value) return null;
    result[field.key] = value;
  }
  return result;
}

// 用 Google 地圖的通用網址格式開啟導航，不需要申請 API 金鑰。
// 手機上會直接跳轉到 Google 地圖 App，桌機則開網頁版。
function googleMapsDirectionsUrl(restaurant) {
  return `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;
}

function buildPopupHtml(restaurant, agg) {
  const statLines = CHECKLIST_FIELDS.map((field) => {
    const stat = agg.byField[field.key];
    const verdict = getFieldVerdict(stat);
    const line = t('stat_line', {
      label: t('field_' + field.key),
      icon: verdict.icon,
      verdict: t('verdict_' + verdict.kind),
    });
    return `<p>${line}</p>`;
  }).join('');

  const notesInfo = getVisibleNotes(restaurant.reviews);
  const notesHtml = notesInfo.visible.length
    ? `
      <div class="popup-notes">
        <p class="popup-notes-heading">${escapeHtml(t('popup_notes_heading'))}</p>
        <ul class="popup-notes-list">
          ${notesInfo.visible.map((review) => `<li>${escapeHtml(review.notes)}</li>`).join('')}
        </ul>
        ${notesInfo.overflowCount > 0 ? `<p class="popup-notes-more">${escapeHtml(t('popup_notes_more', { count: notesInfo.overflowCount }))}</p>` : ''}
      </div>
    `
    : '';

  return `
    <div class="popup-content">
      <h3>${escapeHtml(restaurant.name)}</h3>
      ${restaurant.address ? `<p class="popup-address">${escapeHtml(restaurant.address)}</p>` : ''}
      ${statLines}
      <p class="popup-total">${escapeHtml(t('popup_total', { count: agg.total }))}</p>
      ${notesHtml}
      <div class="popup-actions">
        <a class="btn-secondary" href="${googleMapsDirectionsUrl(restaurant)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('popup_directions_btn'))}</a>
        <button type="button" class="btn-primary" onclick="openReviewModal(${restaurant.id})">${escapeHtml(t('popup_review_btn'))}</button>
      </div>
      <button type="button" class="popup-report-link" onclick="openReportModal(${restaurant.id})">${escapeHtml(t('popup_report_btn'))}</button>
    </div>
  `;
}

// ---- 評論表單 modal ----
function openReviewModal(restaurantId) {
  const restaurant = restaurantsById.get(restaurantId);
  if (!restaurant) return;
  document.getElementById('review-modal-title').textContent = t('review_modal_title', { name: restaurant.name });
  const form = document.getElementById('review-form');
  form.reset();
  form.elements['restaurant_id'].value = restaurantId;
  document.getElementById('review-modal').classList.add('open');
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('open');
}

async function handleReviewFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (form.elements['website'].value) return; // honeypot：機器人才會填這欄，直接靜默擋掉

  const restaurantId = Number(form.elements['restaurant_id'].value);
  const checklist = readChecklistFromForm(form);
  const notes = form.elements['notes'].value.trim();

  if (!checklist) {
    alert(t('checklist_required_alert'));
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await insertReview({ restaurant_id: restaurantId, ...checklist, notes });
    const restaurant = restaurantsById.get(restaurantId);
    restaurant.reviews = restaurant.reviews || [];
    // 帶著 notes/created_at 一起塞進本機快取，這樣剛送出的備註不用重新整理頁面就會出現在 popup 裡。
    restaurant.reviews.push({ ...checklist, notes, created_at: new Date().toISOString() });
    refreshRestaurantMarker(restaurant);
    closeReviewModal();
  } catch (err) {
    console.error(err);
    alert(t('review_submit_failed_alert'));
  } finally {
    submitBtn.disabled = false;
  }
}

// ---- 回報問題 modal ----
function openReportModal(restaurantId) {
  const restaurant = restaurantsById.get(restaurantId);
  if (!restaurant) return;
  document.getElementById('report-modal-title').textContent = t('report_modal_title', { name: restaurant.name });
  const form = document.getElementById('report-form');
  form.reset();
  form.elements['restaurant_id'].value = restaurantId;
  document.getElementById('report-modal').classList.add('open');
}

function closeReportModal() {
  document.getElementById('report-modal').classList.remove('open');
}

async function handleReportFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (form.elements['website'].value) return; // honeypot

  const restaurantId = Number(form.elements['restaurant_id'].value);
  const reportType = form.elements['report_type'].value;
  const message = form.elements['message'].value.trim();

  if (!reportType) {
    alert(t('report_type_required_alert'));
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await insertReport({ restaurant_id: restaurantId, report_type: reportType, message });
    closeReportModal();
    alert(t('report_submitted_alert'));
  } catch (err) {
    console.error(err);
    alert(t('report_submit_failed_alert'));
  } finally {
    submitBtn.disabled = false;
  }
}

// ---- 新增餐廳 modal ----
let pendingLatLng = null;

function openNewRestaurantForm(latlng) {
  pendingLatLng = latlng;
  const form = document.getElementById('new-restaurant-form');
  form.reset();
  document.getElementById('new-restaurant-modal').classList.add('open');
}

function cancelNewRestaurantForm() {
  document.getElementById('new-restaurant-modal').classList.remove('open');
  removeTempMarker();
  pendingLatLng = null;
}

async function handleNewRestaurantFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (form.elements['website'].value) return; // honeypot

  const name = form.elements['name'].value.trim();
  const address = form.elements['address'].value.trim();
  const checklist = readChecklistFromForm(form);
  const notes = form.elements['notes'].value.trim();

  if (!name) {
    alert(t('new_restaurant_name_required_alert'));
    return;
  }
  if (!checklist) {
    alert(t('checklist_required_alert'));
    return;
  }
  if (!pendingLatLng) {
    alert(t('new_restaurant_location_required_alert'));
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const restaurant = await insertRestaurant({
      name,
      address,
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
    });
    await insertReview({ restaurant_id: restaurant.id, ...checklist, notes });
    // 帶著 notes/created_at 一起塞進本機快取，這樣剛送出的備註不用重新整理頁面就會出現在 popup 裡。
    restaurant.reviews = [{ ...checklist, notes, created_at: new Date().toISOString() }];
    removeTempMarker();
    renderRestaurantMarker(restaurant);
    document.getElementById('new-restaurant-modal').classList.remove('open');
    pendingLatLng = null;
  } catch (err) {
    console.error(err);
    alert(t('new_restaurant_submit_failed_alert'));
  } finally {
    submitBtn.disabled = false;
  }
}

function wireHelpButton() {
  document.getElementById('help-btn').addEventListener('click', () => {
    document.getElementById('help-modal').classList.add('open');
  });
}

function wireModalCloseButtons() {
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal.id === 'new-restaurant-modal') {
        cancelNewRestaurantForm();
      } else {
        modal.classList.remove('open');
      }
    });
  });
}
