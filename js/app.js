// 進入點：頁面載入完成後，把地圖、資料、表單事件全部串起來。

document.addEventListener('DOMContentLoaded', async () => {
  applyStaticTranslations(); // 先套用固定文字，語言若是從 localStorage 讀到 'en'，畫面一開始就是英文，不會先閃中文
  renderChecklistFieldsets();
  initMap();
  wireAddRestaurantButton();
  wireModalCloseButtons();
  wireLocateButton();
  wireUseMyLocationButton();
  wireHelpButton();
  document.getElementById('catering-btn').addEventListener('click', openCateringMap);
  wireLangToggleButton();

  document.getElementById('review-form').addEventListener('submit', handleReviewFormSubmit);
  document.getElementById('new-restaurant-form').addEventListener('submit', handleNewRestaurantFormSubmit);
  document.getElementById('report-form').addEventListener('submit', handleReportFormSubmit);

  try {
    const restaurants = await fetchRestaurantsWithReviews();
    restaurants.forEach(renderRestaurantMarker);
    focusRestaurantFromUrl(restaurants);
  } catch (err) {
    console.error(err);
    alert(t('load_failed_alert'));
  }
});

// 語言切換：固定文字交給 applyStaticTranslations()（setLang 內部會呼叫），
// 這裡只需要重繪「動態產生、setLang 不認得」的兩塊——新增/評論表單裡的勾選欄位，
// 以及已經畫在地圖上、每個標記各自的 popup 內容。
function wireLangToggleButton() {
  document.getElementById('lang-toggle-btn').addEventListener('click', () => {
    const nextLang = getLang() === 'en' ? 'zh' : 'en';
    setLang(nextLang, () => {
      renderChecklistFieldsets();
      restaurantsById.forEach((restaurant) => refreshRestaurantMarker(restaurant));
      if (cateringMap) updateCateringCount();
    });
  });
}

// 從管理員後台點「在地圖上看」過來時，網址會帶 ?focus=<restaurant_id>，
// 資料載入完成後把地圖移過去、順便打開那家店的 popup。
function focusRestaurantFromUrl(restaurants) {
  const focusId = Number(new URLSearchParams(window.location.search).get('focus'));
  if (!focusId) return;
  const restaurant = restaurants.find((r) => r.id === focusId);
  if (!restaurant) return;
  // 企業訂餐的店家在另一張地圖上，要先打開那張地圖（第一次打開才會畫出標記）
  if (mapTypeOf(restaurant) === 'catering') openCateringMap();
  const marker = markersById.get(focusId);
  if (!marker) return;
  mapFor(mapTypeOf(restaurant)).setView([restaurant.lat, restaurant.lng], 17);
  marker.openPopup();
}
