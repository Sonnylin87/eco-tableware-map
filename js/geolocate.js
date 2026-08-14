// 「定位我」功能：用瀏覽器內建的 Geolocation API 找出使用者目前位置，
// 在地圖上用藍色圓點標出來（跟餐廳的彩色標記區分開），並提供一個
// 「直接用這個位置新增店家」的捷徑。不需要任何第三方服務或 API 金鑰。

let myLocationMarker = null;
let myLocationAccuracyCircle = null;

function removeMyLocationMarker() {
  if (myLocationMarker) {
    leafletMap.removeLayer(myLocationMarker);
    myLocationMarker = null;
  }
  if (myLocationAccuracyCircle) {
    leafletMap.removeLayer(myLocationAccuracyCircle);
    myLocationAccuracyCircle = null;
  }
}

function showMyLocationOnMap(lat, lng, accuracy) {
  removeMyLocationMarker();
  myLocationMarker = L.circleMarker([lat, lng], {
    radius: 8,
    color: '#fff',
    weight: 2,
    fillColor: '#1a73e8',
    fillOpacity: 1,
  }).addTo(leafletMap);
  if (accuracy) {
    myLocationAccuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      color: '#1a73e8',
      weight: 1,
      fillColor: '#1a73e8',
      fillOpacity: 0.12,
    }).addTo(leafletMap);
  }
}

// 把瀏覽器的 callback 式定位 API 包成 Promise，方便用 async/await。
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('NOT_SUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

function geolocationErrorMessage(err) {
  if (err.message === 'NOT_SUPPORTED') return '這個瀏覽器不支援定位功能。';
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return '沒有取得定位權限，請到瀏覽器設定允許這個網站使用你的位置。';
    case err.POSITION_UNAVAILABLE:
      return '目前抓不到你的位置，請稍後再試一次。';
    case err.TIMEOUT:
      return '定位逾時，請稍後再試一次。';
    default:
      return '定位失敗，請稍後再試一次。';
  }
}

function wireLocateButton() {
  const btn = document.getElementById('locate-me-btn');
  btn.addEventListener('click', async () => {
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '定位中…';
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      leafletMap.setView([latitude, longitude], 17);
      showMyLocationOnMap(latitude, longitude, accuracy);
    } catch (err) {
      alert(geolocationErrorMessage(err));
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// 「新增店家」選擇視窗裡的「使用我目前的位置」：定位成功後直接接上
// 跟點地圖／輸入地址一樣的新增流程（放暫時標記、開新增餐廳表單）。
function wireUseMyLocationButton() {
  const btn = document.getElementById('choice-use-my-location-btn');
  btn.addEventListener('click', async () => {
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '定位中…';
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      document.getElementById('add-restaurant-choice-modal').classList.remove('open');
      leafletMap.setView([latitude, longitude], 17);
      showMyLocationOnMap(latitude, longitude, accuracy);
      removeTempMarker();
      tempMarker = L.marker([latitude, longitude], { icon: markerIcon('gray') }).addTo(leafletMap);
      openNewRestaurantForm({ lat: latitude, lng: longitude }); // 定義在 ui.js
    } catch (err) {
      alert(geolocationErrorMessage(err));
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}
