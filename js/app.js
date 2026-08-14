// 進入點：頁面載入完成後，把地圖、資料、表單事件全部串起來。

document.addEventListener('DOMContentLoaded', async () => {
  renderChecklistFieldsets();
  initMap();
  wireAddRestaurantButton();
  wireModalCloseButtons();
  wireLocateButton();
  wireUseMyLocationButton();

  document.getElementById('review-form').addEventListener('submit', handleReviewFormSubmit);
  document.getElementById('new-restaurant-form').addEventListener('submit', handleNewRestaurantFormSubmit);
  document.getElementById('report-form').addEventListener('submit', handleReportFormSubmit);

  try {
    const restaurants = await fetchRestaurantsWithReviews();
    restaurants.forEach(renderRestaurantMarker);
    focusRestaurantFromUrl(restaurants);
  } catch (err) {
    console.error(err);
    alert('無法載入資料，請確認 js/config.js 是否已填入正確的 Supabase URL / anon key。');
  }
});

// 從管理員後台點「在地圖上看」過來時，網址會帶 ?focus=<restaurant_id>，
// 資料載入完成後把地圖移過去、順便打開那家店的 popup。
function focusRestaurantFromUrl(restaurants) {
  const focusId = Number(new URLSearchParams(window.location.search).get('focus'));
  if (!focusId) return;
  const restaurant = restaurants.find((r) => r.id === focusId);
  const marker = markersById.get(focusId);
  if (!restaurant || !marker) return;
  leafletMap.setView([restaurant.lat, restaurant.lng], 17);
  marker.openPopup();
}
