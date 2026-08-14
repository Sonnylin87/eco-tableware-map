// 純函式：把一個餐廳底下所有評論，統計成每個項目「有/沒有/不確定」的次數，
// 並依統計結果決定地圖標記要顯示什麼顏色。不依賴任何 DOM 或網路請求，
// 方便單獨測試。

// 所有表格式勾選項目定義在這裡，之後要再新增項目只要在這個陣列加一筆，
// 資料庫欄位名稱要跟 supabase/schema.sql 的 reviews 表一致。
// （吸管已移除；資料庫裡的 provides_straw 欄位還在、舊資料不會被刪掉，
// 只是網站前端不再顯示、不再收集這個項目了。）
const CHECKLIST_FIELDS = [
  { key: 'reusable_tableware', label: '環保餐具' },
  { key: 'reusable_cup', label: '環保杯' },
  { key: 'reusable_bowl', label: '環保碗' },
  { key: 'reusable_plate', label: '環保盤' },
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

// 把「有 X / 無 Y / 不確定 Z」的統計濃縮成一句最多票的結論，比列出三個數字好讀。
// 平手（包含全部都還是 0 票）就顯示「尚無共識」。
function getFieldVerdict(stat) {
  const max = Math.max(stat.yes, stat.no, stat.unknown);
  if (max === 0) return { text: '尚無回報', icon: '❔' };
  const isTie = [stat.yes, stat.no, stat.unknown].filter((count) => count === max).length > 1;
  if (isTie) return { text: '尚無共識', icon: '❔' };
  if (stat.yes === max) return { text: '有提供', icon: '✅' };
  if (stat.no === max) return { text: '沒有提供', icon: '❌' };
  return { text: '不確定', icon: '❔' };
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
