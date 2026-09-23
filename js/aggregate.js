// 純函式：把一個餐廳底下所有評論，統計成每個項目「有/沒有/不確定」的次數，
// 供 popup 顯示各項目的多數決結論。不依賴任何 DOM 或網路請求，方便單獨測試。

// 所有表格式勾選項目定義在這裡，之後要再新增項目只要在這個陣列加一筆，
// 資料庫欄位名稱要跟 supabase/schema.sql 的 reviews 表一致。
// （吸管已移除；資料庫裡的 provides_straw 欄位還在、舊資料不會被刪掉，
// 只是網站前端不再顯示、不再收集這個項目了。）
const CHECKLIST_FIELDS = [
  { key: 'reusable_bowl', label: '環保碗' },
  { key: 'reusable_plate', label: '環保盤' },
  { key: 'reusable_tableware', label: '環保餐具' },
  { key: 'reusable_cup', label: '環保杯' },
  { key: 'offers_delivery', label: '外送' },
];

// 外送這項如果多數決結果是「有提供」，地圖標記要改成黃色（見 map.js 的
// markerColorForAggregate），跟其他環保用品項目（不影響標記顏色）分開處理，
// 這個 key 常數集中在這裡，map.js 直接引用，兩邊才不會各自寫一份字串。
const DELIVERY_FIELD_KEY = 'offers_delivery';

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

// 備註公開顯示功能上線的時間戳：只有這個時間點之後新增的評論備註才會被
// 公開顯示在地圖 popup 上。這之前累積的舊備註本來就只給管理員看，
// 上線時決定不追溯公開，維持原樣、只從這之後的新資料開始顯示。
const NOTES_PUBLIC_SINCE = '2026-09-11T11:58:56Z';

// popup 裡最多顯示幾則備註，超過的用「還有 N 則…」文字帶過，不做展開/分頁互動。
const NOTES_DISPLAY_LIMIT = 5;

// 從一間餐廳的評論裡，篩出「上線後新增、而且有填備註」的部分，最新的排前面。
// 回傳 { visible: 最多 NOTES_DISPLAY_LIMIT 則, overflowCount: 篩選後超過顯示上限的則數 }。
function getVisibleNotes(reviews) {
  const eligible = (reviews || [])
    .filter((r) => r.notes && r.notes.trim() && r.created_at && new Date(r.created_at) >= new Date(NOTES_PUBLIC_SINCE))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return {
    visible: eligible.slice(0, NOTES_DISPLAY_LIMIT),
    overflowCount: Math.max(0, eligible.length - NOTES_DISPLAY_LIMIT),
  };
}
