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

function markerIcon(color) {
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
  const marker = L.marker([restaurant.lat, restaurant.lng], { icon: markerIcon(getMarkerColor(agg)) });
  marker.bindPopup(buildPopupHtml(restaurant, agg));
  marker.addTo(leafletMap);
  markersById.set(restaurant.id, marker);
  return marker;
}

// 送出新評論後呼叫：更新既有標記的顏色與彈出視窗內容，不用整頁重新整理。
function refreshRestaurantMarker(restaurant) {
  restaurantsById.set(restaurant.id, restaurant);
  const agg = computeAggregate(restaurant.reviews || []);
  const marker = markersById.get(restaurant.id);
  if (!marker) return renderRestaurantMarker(restaurant);
  marker.setIcon(markerIcon(getMarkerColor(agg)));
  marker.setPopupContent(buildPopupHtml(restaurant, agg));
  return marker;
}

// ---- 「新增店家」：點地圖放置暫時標記 ----
let addingRestaurantMode = false;
let tempMarker = null;

function wireAddRestaurantButton() {
  const btn = document.getElementById('add-restaurant-btn');
  btn.addEventListener('click', () => {
    if (addingRestaurantMode) {
      exitAddingRestaurantMode();
      return;
    }
    addingRestaurantMode = true;
    btn.classList.add('active');
    btn.textContent = '請點地圖上任一位置（再按一次取消）';
    leafletMap.getContainer().style.cursor = 'crosshair';
    leafletMap.once('click', onMapClickForNewRestaurant);
  });
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
  tempMarker = L.marker(e.latlng, { icon: markerIcon('gray') }).addTo(leafletMap);
  openNewRestaurantForm(e.latlng); // 定義在 ui.js
}

function removeTempMarker() {
  if (tempMarker) {
    leafletMap.removeLayer(tempMarker);
    tempMarker = null;
  }
}
