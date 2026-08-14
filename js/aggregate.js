// 純函式：把一個餐廳底下所有評論，統計成「有/沒有/不確定」的次數，
// 並依統計結果決定地圖標記要顯示什麼顏色。不依賴任何 DOM 或網路請求，
// 方便單獨測試。

function computeAggregate(reviews) {
  const agg = {
    total: reviews.length,
    tableware: { yes: 0, no: 0, unknown: 0 },
    cup: { yes: 0, no: 0, unknown: 0 },
  };
  for (const r of reviews) {
    agg.tableware[r.reusable_tableware]++;
    agg.cup[r.reusable_cup]++;
  }
  return agg;
}

// green  = 目前回報「有提供」比「沒有」多
// red    = 目前回報「沒有提供」比「有」多
// yellow = 平手，或多數回報「不確定」
// gray   = 還沒有人填過
function getMarkerColor(agg) {
  if (agg.total === 0) return 'gray';
  const yes = agg.tableware.yes + agg.cup.yes;
  const no = agg.tableware.no + agg.cup.no;
  if (yes > no) return 'green';
  if (no > yes) return 'red';
  return 'yellow';
}
