// 純函式：把一個餐廳底下所有評論，統計成每個項目「有/沒有/不確定」的次數，
// 並依統計結果決定地圖標記要顯示什麼顏色。不依賴任何 DOM 或網路請求，
// 方便單獨測試。

// 所有表格式勾選項目定義在這裡，之後要再新增項目只要在這個陣列加一筆，
// 資料庫欄位名稱要跟 supabase/schema.sql 的 reviews 表一致。
const CHECKLIST_FIELDS = [
  { key: 'reusable_tableware', label: '環保餐具' },
  { key: 'reusable_cup', label: '環保杯' },
  { key: 'reusable_bowl', label: '環保碗' },
  { key: 'reusable_plate', label: '環保盤' },
  { key: 'provides_straw', label: '吸管' },
];

function computeAggregate(reviews) {
  const agg = { total: reviews.length, byField: {} };
  for (const field of CHECKLIST_FIELDS) {
    agg.byField[field.key] = { yes: 0, no: 0, unknown: 0 };
  }
  for (const r of reviews) {
    for (const field of CHECKLIST_FIELDS) {
      agg.byField[field.key][r[field.key]]++;
    }
  }
  return agg;
}

// green  = 目前回報「有提供」比「沒有」多（所有項目合計）
// red    = 目前回報「沒有提供」比「有」多
// yellow = 平手，或多數回報「不確定」
// gray   = 還沒有人填過
function getMarkerColor(agg) {
  if (agg.total === 0) return 'gray';
  let yes = 0;
  let no = 0;
  for (const field of CHECKLIST_FIELDS) {
    yes += agg.byField[field.key].yes;
    no += agg.byField[field.key].no;
  }
  if (yes > no) return 'green';
  if (no > yes) return 'red';
  return 'yellow';
}
