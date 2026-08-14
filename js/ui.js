// 彈出視窗（popup）的 HTML 組裝，以及評論表單 / 新增餐廳表單這兩個 modal 的開關與送出邏輯。

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function buildPopupHtml(restaurant, agg) {
  return `
    <div class="popup-content">
      <h3>${escapeHtml(restaurant.name)}</h3>
      ${restaurant.address ? `<p class="popup-address">${escapeHtml(restaurant.address)}</p>` : ''}
      <p>環保餐具：${agg.tableware.yes} 有 / ${agg.tableware.no} 無 / ${agg.tableware.unknown} 不確定</p>
      <p>環保杯：${agg.cup.yes} 有 / ${agg.cup.no} 無 / ${agg.cup.unknown} 不確定</p>
      <p class="popup-total">共 ${agg.total} 筆回報</p>
      <button type="button" class="btn-primary" onclick="openReviewModal(${restaurant.id})">填寫評論</button>
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
  const reusable_tableware = form.elements['reusable_tableware'].value;
  const reusable_cup = form.elements['reusable_cup'].value;
  const notes = form.elements['notes'].value.trim();

  if (!reusable_tableware || !reusable_cup) {
    alert('請選擇環保餐具和環保杯的狀況');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await insertReview({ restaurant_id: restaurantId, reusable_tableware, reusable_cup, notes });
    const restaurant = restaurantsById.get(restaurantId);
    restaurant.reviews = restaurant.reviews || [];
    restaurant.reviews.push({ reusable_tableware, reusable_cup });
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

function openNewRestaurantForm(latlng) {
  pendingLatLng = latlng;
  document.getElementById('new-restaurant-form').reset();
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
  const reusable_tableware = form.elements['reusable_tableware'].value;
  const reusable_cup = form.elements['reusable_cup'].value;
  const notes = form.elements['notes'].value.trim();

  if (!name) {
    alert('請填寫店名');
    return;
  }
  if (!reusable_tableware || !reusable_cup) {
    alert('請選擇環保餐具和環保杯的狀況');
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
    await insertReview({ restaurant_id: restaurant.id, reusable_tableware, reusable_cup, notes });
    restaurant.reviews = [{ reusable_tableware, reusable_cup }];
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
