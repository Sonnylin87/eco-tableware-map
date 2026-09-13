// Leaflet 地圖初始化、標記渲染、以及「點地圖新增餐廳」的互動模式。
// restaurantsById / markersById 是整個網站共用的簡單狀態，之後的
// ui.js / app.js 會在同一個全域作用域下直接使用它們。

let leafletMap = null;
const restaurantsById = new Map(); // id -> 餐廳資料（含 reviews 陣列）
const markersById = new Map(); // id -> Leaflet marker

function initMap() {
  leafletMap = L.map('map').setView([23.6978, 120.9605], 8); // 台灣中心點
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(leafletMap);
  return leafletMap;
}

// color 預設是所有已收錄餐廳共用的品牌綠（見 css 的 .marker-brand）。
// 只有「新增店家」流程裡還沒送出的暫時標記會另外傳 'gray'，
// 標記本身不再依評論結果變色——避免看起來像在幫店家打分數/貼標籤。
function markerIcon(color = 'brand') {
  return L.divIcon({
    className: '',
    html: `<span class="marker-dot marker-${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function renderRestaurantMarker(restaurant) {
  restaurantsById.set(restaurant.id, restaurant);
  const agg = computeAggregate(restaurant.reviews || []);
  const marker = L.marker([restaurant.lat, restaurant.lng], { icon: markerIcon() });
  marker.bindPopup(buildPopupHtml(restaurant, agg));
  marker.addTo(leafletMap);
  markersById.set(restaurant.id, marker);
  return marker;
}

// 送出新評論後呼叫：更新彈出視窗內容，不用整頁重新整理。
// 標記顏色固定不變，這裡不用再重設 icon。
function refreshRestaurantMarker(restaurant) {
  restaurantsById.set(restaurant.id, restaurant);
  const agg = computeAggregate(restaurant.reviews || []);
  const marker = markersById.get(restaurant.id);
  if (!marker) return renderRestaurantMarker(restaurant);
  marker.setPopupContent(buildPopupHtml(restaurant, agg));
  return marker;
}

// ---- 「新增店家」：點地圖放置暫時標記 ----
let addingRestaurantMode = false;
let tempMarker = null;

// 按下「新增店家」：如果已經在點地圖模式中，再按一次算取消；
// 否則跳出選擇視窗，讓使用者選「點地圖」或「使用目前位置」。
function wireAddRestaurantButton() {
  const btn = document.getElementById('add-restaurant-btn');
  btn.addEventListener('click', () => {
    if (addingRestaurantMode) {
      exitAddingRestaurantMode();
      return;
    }
    document.getElementById('add-restaurant-choice-modal').classList.add('open');
  });

  document.getElementById('choice-pick-on-map-btn').addEventListener('click', () => {
    document.getElementById('add-restaurant-choice-modal').classList.remove('open');
    enterAddingRestaurantMode();
  });
}

function enterAddingRestaurantMode() {
  addingRestaurantMode = true;
  const btn = document.getElementById('add-restaurant-btn');
  btn.classList.add('active');
  btn.textContent = '請點地圖上任一位置（再按一次取消）';
  leafletMap.getContainer().style.cursor = 'crosshair';
  leafletMap.once('click', onMapClickForNewRestaurant);
}

function exitAddingRestaurantMode() {
  addingRestaurantMode = false;
  const btn = document.getElementById('add-restaurant-btn');
  btn.classList.remove('active');
  btn.textContent = '新增店家';
  leafletMap.getContainer().style.cursor = '';
  leafletMap.off('click', onMapClickForNewRestaurant);
}

function onMapClickForNewRestaurant(e) {
  exitAddingRestaurantMode();
  removeTempMarker();
  tempMarker = L.marker(e.latlng, { icon: markerIcon('gray') }).addTo(leafletMap);
  openNewRestaurantForm(e.latlng); // 定義在 ui.js
}

function removeTempMarker() {
  if (tempMarker) {
    leafletMap.removeLayer(tempMarker);
    tempMarker = null;
  }
}
