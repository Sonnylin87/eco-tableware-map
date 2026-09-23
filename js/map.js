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
// 「新增店家」流程裡還沒送出的暫時標記會另外傳 'gray'。
// 'catering' 是企業訂餐地圖上的店家（見 .marker-catering）。
// 評論項目不影響標記顏色（避免看起來像在幫店家打分數/貼標籤）。
function markerIcon(color = 'brand') {
  return L.divIcon({
    className: '',
    html: `<span class="marker-dot marker-${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

// 店家分兩種地圖（restaurants.map_type）：
// - 'eco'：主地圖，一般餐廳有沒有提供環保碗/盤/杯/餐具
// - 'catering'：企業訂餐地圖，接大量訂單、有附環保餐具的店家，開在另一個 modal 裡的獨立地圖
// 兩張地圖的標記都存在同一個 markersById（id 在資料庫裡本來就不會重複）。
function mapTypeOf(restaurant) {
  return restaurant.map_type === 'catering' ? 'catering' : 'eco';
}

function mapFor(mapType) {
  return mapType === 'catering' ? cateringMap : leafletMap;
}

function renderRestaurantMarker(restaurant) {
  restaurantsById.set(restaurant.id, restaurant);
  const targetMap = mapFor(mapTypeOf(restaurant));
  if (!targetMap) return null; // 企業訂餐地圖還沒打開過，等 openCateringMap() 建好地圖時再一次畫
  const agg = computeAggregate(restaurant.reviews || []);
  const color = mapTypeOf(restaurant) === 'catering' ? 'catering' : 'brand';
  const marker = L.marker([restaurant.lat, restaurant.lng], { icon: markerIcon(color) });
  marker.bindPopup(buildPopupHtml(restaurant, agg));
  marker.addTo(targetMap);
  markersById.set(restaurant.id, marker);
  return marker;
}

// 送出新評論 / 切換語言後呼叫：更新彈出視窗內容。
function refreshRestaurantMarker(restaurant) {
  restaurantsById.set(restaurant.id, restaurant);
  const marker = markersById.get(restaurant.id);
  if (!marker) return renderRestaurantMarker(restaurant);
  marker.setPopupContent(buildPopupHtml(restaurant, computeAggregate(restaurant.reviews || [])));
  return marker;
}

// ---- 企業訂餐地圖：另一張獨立的地圖，放在 #catering-modal 裡 ----
// 第一次打開 modal 時才建立（Leaflet 在 display:none 的容器裡初始化會算錯尺寸）。
let cateringMap = null;

function isCateringMapOpen() {
  return document.getElementById('catering-modal').classList.contains('open');
}

function openCateringMap() {
  document.getElementById('catering-modal').classList.add('open');
  if (!cateringMap) {
    cateringMap = L.map('catering-map').setView(leafletMap.getCenter(), leafletMap.getZoom());
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(cateringMap);
    restaurantsById.forEach((restaurant) => {
      if (mapTypeOf(restaurant) === 'catering') renderRestaurantMarker(restaurant);
    });
  } else {
    cateringMap.invalidateSize();
  }
  updateCateringCount();
}

function closeCateringMap() {
  if (addingRestaurantMode && addingMapType === 'catering') exitAddingRestaurantMode();
  document.getElementById('catering-modal').classList.remove('open');
}

function updateCateringCount() {
  let count = 0;
  restaurantsById.forEach((restaurant) => {
    if (mapTypeOf(restaurant) === 'catering') count++;
  });
  document.getElementById('catering-count').textContent = count
    ? t('catering_count', { count })
    : t('catering_empty');
}

// ---- 「新增店家」：點地圖放置暫時標記 ----
// 主地圖跟企業訂餐地圖各有自己的「新增店家」按鈕，共用同一套流程：
// addingMapType 記錄這次是要新增到哪一張地圖。
let addingRestaurantMode = false;
let addingMapType = 'eco';
let tempMarker = null;

function addButtonFor(mapType) {
  return document.getElementById(mapType === 'catering' ? 'catering-add-btn' : 'add-restaurant-btn');
}

function addButtonLabelKey(mapType) {
  return mapType === 'catering' ? 'catering_add_btn' : 'add_restaurant_btn';
}

// 按下「新增店家」：如果已經在點地圖模式中，再按一次算取消；
// 否則跳出選擇視窗，讓使用者選「點地圖」或「使用目前位置」。
function wireAddRestaurantButton() {
  ['eco', 'catering'].forEach((mapType) => {
    addButtonFor(mapType).addEventListener('click', () => {
      if (addingRestaurantMode) {
        const wasSameMap = addingMapType === mapType;
        exitAddingRestaurantMode();
        if (wasSameMap) return;
      }
      addingMapType = mapType;
      document.getElementById('add-restaurant-choice-modal').classList.add('open');
    });
  });

  document.getElementById('choice-pick-on-map-btn').addEventListener('click', () => {
    document.getElementById('add-restaurant-choice-modal').classList.remove('open');
    enterAddingRestaurantMode();
  });
}

function enterAddingRestaurantMode() {
  addingRestaurantMode = true;
  const btn = addButtonFor(addingMapType);
  btn.classList.add('active');
  btn.textContent = t('add_restaurant_btn_picking');
  const targetMap = mapFor(addingMapType);
  targetMap.getContainer().style.cursor = 'crosshair';
  targetMap.once('click', onMapClickForNewRestaurant);
}

function exitAddingRestaurantMode() {
  addingRestaurantMode = false;
  const btn = addButtonFor(addingMapType);
  btn.classList.remove('active');
  btn.textContent = t(addButtonLabelKey(addingMapType));
  const targetMap = mapFor(addingMapType);
  targetMap.getContainer().style.cursor = '';
  targetMap.off('click', onMapClickForNewRestaurant);
}

function onMapClickForNewRestaurant(e) {
  exitAddingRestaurantMode();
  placeTempMarker(e.latlng);
  openNewRestaurantForm(e.latlng); // 定義在 ui.js
}

function placeTempMarker(latlng) {
  removeTempMarker();
  tempMarker = L.marker(latlng, { icon: markerIcon('gray') }).addTo(mapFor(addingMapType));
}

function removeTempMarker() {
  if (tempMarker) {
    tempMarker.remove();
    tempMarker = null;
  }
}
