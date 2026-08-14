// 進入點：頁面載入完成後，把地圖、資料、表單事件全部串起來。

document.addEventListener('DOMContentLoaded', async () => {
  renderChecklistFieldsets();
  initMap();
  wireAddRestaurantButton();
  wireModalCloseButtons();

  document.getElementById('review-form').addEventListener('submit', handleReviewFormSubmit);
  document.getElementById('new-restaurant-form').addEventListener('submit', handleNewRestaurantFormSubmit);

  try {
    const restaurants = await fetchRestaurantsWithReviews();
    restaurants.forEach(renderRestaurantMarker);
  } catch (err) {
    console.error(err);
    alert('無法載入資料，請確認 js/config.js 是否已填入正確的 Supabase URL / anon key。');
  }
});
