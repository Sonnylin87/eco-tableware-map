// 用 Nominatim（OpenStreetMap 的免費地址查詢服務）把使用者輸入的地址
// 轉成經緯度，不需要申請任何 API 金鑰、不用綁信用卡。
// 使用規範：https://operations.osmfoundation.org/policies/nominatim/
// 低流量的網頁小工具直接從瀏覽器呼叫是允許的用法，就不用自己架伺服器代轉。
async function geocodeAddress(query) {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '1',
    countrycodes: 'tw', // 這個網站只服務台灣，查詢結果限制在台灣境內
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { 'Accept-Language': 'zh-TW' },
  });
  if (!res.ok) throw new Error(`地址查詢失敗：HTTP ${res.status}`);
  const results = await res.json();
  if (results.length === 0) return null;
  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}
