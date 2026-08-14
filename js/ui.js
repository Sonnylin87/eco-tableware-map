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
        <legend>是否提供${escapeHtml(field.label)}？</legend>
        <label><input type="radio" name="${field.key}" value="yes" required /> 有提供</label>
        <label><input type="radio" name="${field.key}" value="no" /> 沒有提供</label>
        <label><input type="radio" name="${field.key}" value="unknown" /> 不確定</label>
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
    return `<p>${field.label}：${stat.yes} 有 / ${stat.no} 無 / ${stat.unknown} 不確定</p>`;
  }).join('');

  return `
    <div class="popup-content">
      <h3>${escapeHtml(restaurant.name)}</h3>
      ${restaurant.address ? `<p class="popup-address">${escapeHtml(restaurant.address)}</p>` : ''}
      ${statLines}
      <p class="popup-total">共 ${agg.total} 筆回報</p>
      <div class="popup-actions">
        <a class="btn-secondary" href="${googleMapsDirectionsUrl(restaurant)}" target="_blank" rel="noopener noreferrer">🧭 導航</a>
        <button type="button" class="btn-primary" onclick="openReviewModal(${restaurant.id})">填寫評論</button>
      </div>
    </div>
  `;
}

// ---- 評論表單 modal ----
function openReviewModal(restaurantId) {
  const restaurant = restaurantsById.get(restaurantId);
  if (!restaurant) return;
  document.getElementById('review-modal-title').textContent = `為「${restaurant.name}」填寫評論`;
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
    alert('請把每個項目都選一個選項');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await insertReview({ restaurant_id: restaurantId, ...checklist, notes });
    const restaurant = restaurantsById.get(restaurantId);
    restaurant.reviews = restaurant.reviews || [];
    restaurant.reviews.push(checklist);
    refreshRestaurantMarker(restaurant);
    closeReviewModal();
  } catch (err) {
    console.error(err);
    alert('送出失敗，請稍後再試一次。');
  } finally {
    submitBtn.disabled = false;
  }
}

// ---- 新增餐廳 modal ----
let pendingLatLng = null;

function openNewRestaurantForm(latlng, prefillAddress) {
  pendingLatLng = latlng;
  const form = document.getElementById('new-restaurant-form');
  form.reset();
  if (prefillAddress) {
    form.elements['address'].value = prefillAddress;
  }
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
    alert('請填寫店名');
    return;
  }
  if (!checklist) {
    alert('請把每個項目都選一個選項');
    return;
  }
  if (!pendingLatLng) {
    alert('請先在地圖上點選位置');
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
    restaurant.reviews = [checklist];
    removeTempMarker();
    renderRestaurantMarker(restaurant);
    document.getElementById('new-restaurant-modal').classList.remove('open');
    pendingLatLng = null;
  } catch (err) {
    console.error(err);
    alert('新增失敗，請稍後再試一次。');
  } finally {
    submitBtn.disabled = false;
  }
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
