// 雙語系統（中文／英文），只給主站（index.html）用——管理後台（admin.html）
// 沒有載入這個檔案，維持純中文，見 aggregate.js 開頭的說明。
//
// 用法：
// - 固定文字：HTML 元素上加 data-i18n="key"（textContent）或
//   data-i18n-placeholder="key"（input/textarea 的 placeholder），
//   applyStaticTranslations() 會自動套用，不用一個個手動賦值。
// - 動態產生的文字（popup、表單裡的勾選項目、alert 訊息）：直接呼叫 t('key', vars)。
// - vars 是 {{name}} 這種佔位符的替換值，例如 t('review_modal_title', { name: '某餐廳' })。

const LANG_STORAGE_KEY = 'map_lang';

const translations = {
  zh: {
    page_title: '綠色生活餐廳地圖',
    toolbar_title: '🍱 綠色生活餐廳地圖',
    help_btn: '❓ 使用說明',
    locate_btn: '📍 定位我',
    locate_btn_loading: '定位中…',
    add_restaurant_btn: '新增店家',
    add_restaurant_btn_picking: '請點地圖上任一位置（再按一次取消）',
    admin_link: '⚙️ 管理',
    lang_toggle: 'EN',

    help_title: '❓ 這是什麼網站？',
    help_intro:
      '這是任何人都能一起維護的地圖：標出提供環保餐具（環保杯／碗／盤／餐具）的餐廳，幫大家減少一次性用品。不需要登入、不需要註冊，人人都能標記、都能留備註。',
    help_view_heading: '🔍 查看一家店',
    help_view_body:
      '點地圖上的圓點，會彈出這家店目前的統計（各項目的結論、大家留的備註），也可以在這裡按「🧭 導航」開 Google 地圖規劃路線，或「回報問題」。',
    help_locate_heading: '📍 定位我',
    help_locate_body: '點右上角「定位我」，會用手機/瀏覽器的定位功能，在地圖上用藍色圓點標出你目前的位置。',
    help_add_heading: '➕ 新增一家店',
    help_add_body:
      '點右上角「新增店家」，可以選擇：在地圖上點選位置，或使用目前所在位置。新增時會順便請你勾選環保餐具/杯/碗/盤的情形，地址欄位選填。',
    help_review_heading: '✍️ 填寫評論',
    help_review_body:
      '對一家店的環保餐具/杯/碗/盤，勾選「有提供／沒有提供／不確定」，可以留一句 50 字內的備註（例如「需要主動詢問店員」）——備註會公開顯示在地圖上給其他人看。同一家店可以有很多人各自留備註。',
    help_report_heading: '🚩 回報問題',
    help_report_body: '如果店家資料錯誤、或這家店已經歇業想申請下架，可以點「回報問題」留言給管理員，回報內容只有管理員看得到，不會公開顯示。',
    help_ok_btn: '我知道了',

    choice_title: '新增店家',
    choice_prompt: '要怎麼標出這家店的位置？',
    choice_pick_on_map: '📍 在地圖上點選位置',
    choice_use_my_location: '🧭 使用我目前的位置',
    cancel_btn: '取消',

    report_type_legend: '回報類型',
    report_type_wrong_info: '資料有誤',
    report_type_delete_request: '想要刪除這家店',
    report_type_other: '其他',
    report_message_label: '留言（選填）',
    report_message_placeholder: '例如：這家店已經歇業了 / 環保杯選項填錯了',
    report_note: '回報只有管理員看得到，不會公開顯示。',
    report_submit_btn: '送出回報',
    report_modal_title: '回報「{{name}}」的問題',
    report_type_required_alert: '請選擇回報類型',
    report_submit_failed_alert: '送出失敗，請稍後再試一次。',
    report_submitted_alert: '已送出，謝謝你的回報，管理員會處理。',

    review_modal_title: '為「{{name}}」填寫評論',
    review_notes_label: '備註（選填）',
    review_notes_placeholder: '例如：需要主動詢問店員才提供',
    new_restaurant_notes_placeholder: '例如：有提供環保吸管',
    review_notes_note: '這則備註會公開顯示給所有人看，最多 50 字。請客觀描述，避免情緒性字眼。',
    submit_btn: '送出',
    checklist_required_alert: '請把每個項目都選一個選項',
    review_submit_failed_alert: '送出失敗，請稍後再試一次。',

    new_restaurant_title: '新增店家',
    new_restaurant_name_label: '店名',
    new_restaurant_address_label: '地址（選填）',
    new_restaurant_name_required_alert: '請填寫店名',
    new_restaurant_location_required_alert: '請先在地圖上點選位置',
    new_restaurant_submit_failed_alert: '新增失敗，請稍後再試一次。',

    checklist_legend: '是否提供{{label}}？',
    checklist_yes: '有提供',
    checklist_no: '沒有提供',
    checklist_unknown: '不確定',

    field_reusable_bowl: '環保碗',
    field_reusable_plate: '環保盤',
    field_reusable_tableware: '環保餐具',
    field_reusable_cup: '環保杯',

    verdict_none: '尚無回報',
    verdict_tie: '尚無共識',
    verdict_yes: '有提供',
    verdict_no: '沒有提供',
    verdict_unknown: '不確定',
    stat_line: '{{label}}：{{icon}} {{verdict}}',

    popup_total: '共 {{count}} 筆回報',
    popup_notes_heading: '📝 大家的備註',
    popup_notes_more: '還有 {{count}} 則…',
    popup_directions_btn: '🧭 導航',
    popup_review_btn: '填寫評論',
    popup_report_btn: '⚠️ 回報問題',

    geo_not_supported: '這個瀏覽器不支援定位功能。',
    geo_permission_denied: '沒有取得定位權限，請到瀏覽器設定允許這個網站使用你的位置。',
    geo_position_unavailable: '目前抓不到你的位置，請稍後再試一次。',
    geo_timeout: '定位逾時，請稍後再試一次。',
    geo_generic_error: '定位失敗，請稍後再試一次。',

    load_failed_alert: '無法載入資料，請確認 js/config.js 是否已填入正確的 Supabase URL / anon key。',
  },
  en: {
    page_title: 'Green Living Restaurant Map',
    toolbar_title: '🍱 Green Living Restaurant Map',
    help_btn: '❓ Help',
    locate_btn: '📍 Locate me',
    locate_btn_loading: 'Locating…',
    add_restaurant_btn: 'Add a place',
    add_restaurant_btn_picking: 'Tap anywhere on the map (tap again to cancel)',
    admin_link: '⚙️ Admin',
    lang_toggle: '中文',

    help_title: '❓ What is this site?',
    help_intro:
      'A crowdsourced map: it marks restaurants that offer reusable tableware (cups/bowls/plates/utensils) to help everyone cut down on single-use items. No login or sign-up needed — anyone can add a place or leave a note.',
    help_view_heading: '🔍 View a place',
    help_view_body:
      'Tap a dot on the map to see its current stats (the verdict for each item, and notes people left). From there you can also tap "🧭 Directions" to open Google Maps, or "Report an issue".',
    help_locate_heading: '📍 Locate me',
    help_locate_body: 'Tap "Locate me" in the top bar to show your current location on the map as a blue dot, using your phone/browser location feature.',
    help_add_heading: '➕ Add a place',
    help_add_body:
      'Tap "Add a place" in the top bar and choose: pick a spot on the map, or use your current location. You\'ll also be asked to mark the reusable tableware/cup/bowl/plate situation; the address field is optional.',
    help_review_heading: '✍️ Leave a review',
    help_review_body:
      'For a place\'s reusable tableware/cup/bowl/plate, choose "Yes / No / Not sure" for each item. You can also leave a note up to 50 characters (e.g. "Need to ask staff") — notes are shown publicly on the map. Many people can leave their own notes for the same place.',
    help_report_heading: '🚩 Report an issue',
    help_report_body: 'If a place\'s info is wrong, or it has closed and you\'d like it removed, tap "Report an issue" to leave a note for the admin. Reports are only visible to admins, never shown publicly.',
    help_ok_btn: 'Got it',

    choice_title: 'Add a place',
    choice_prompt: "How would you like to mark this place's location?",
    choice_pick_on_map: '📍 Pick a spot on the map',
    choice_use_my_location: '🧭 Use my current location',
    cancel_btn: 'Cancel',

    report_type_legend: 'Report type',
    report_type_wrong_info: 'Wrong information',
    report_type_delete_request: 'Request removal',
    report_type_other: 'Other',
    report_message_label: 'Message (optional)',
    report_message_placeholder: "e.g. This place has closed / the reusable cup option is wrong",
    report_note: 'Reports are only visible to admins, never shown publicly.',
    report_submit_btn: 'Submit report',
    report_modal_title: 'Report an issue with "{{name}}"',
    report_type_required_alert: 'Please choose a report type',
    report_submit_failed_alert: 'Submission failed, please try again later.',
    report_submitted_alert: 'Submitted — thanks for the report, an admin will follow up.',

    review_modal_title: 'Leave a review for "{{name}}"',
    review_notes_label: 'Note (optional)',
    review_notes_placeholder: 'e.g. Need to ask staff',
    new_restaurant_notes_placeholder: 'e.g. Reusable straws available',
    review_notes_note: 'This note will be shown publicly to everyone, up to 50 characters. Please keep it factual and avoid emotional language.',
    submit_btn: 'Submit',
    checklist_required_alert: 'Please choose an option for every item',
    review_submit_failed_alert: 'Submission failed, please try again later.',

    new_restaurant_title: 'Add a place',
    new_restaurant_name_label: 'Name',
    new_restaurant_address_label: 'Address (optional)',
    new_restaurant_name_required_alert: 'Please enter a name',
    new_restaurant_location_required_alert: 'Please pick a location on the map first',
    new_restaurant_submit_failed_alert: 'Failed to add, please try again later.',

    checklist_legend: 'Does it offer {{label}}?',
    checklist_yes: 'Yes',
    checklist_no: 'No',
    checklist_unknown: 'Not sure',

    field_reusable_bowl: 'reusable bowls',
    field_reusable_plate: 'reusable plates',
    field_reusable_tableware: 'reusable tableware',
    field_reusable_cup: 'reusable cups',

    verdict_none: 'No reports yet',
    verdict_tie: 'No consensus',
    verdict_yes: 'Yes',
    verdict_no: 'No',
    verdict_unknown: 'Not sure',
    stat_line: '{{label}}: {{icon}} {{verdict}}',

    popup_total: '{{count}} report(s) total',
    popup_notes_heading: '📝 Notes from the community',
    popup_notes_more: '{{count}} more…',
    popup_directions_btn: '🧭 Directions',
    popup_review_btn: 'Leave a review',
    popup_report_btn: '⚠️ Report an issue',

    geo_not_supported: 'This browser does not support location services.',
    geo_permission_denied: 'Location permission was not granted. Please allow this site to use your location in your browser settings.',
    geo_position_unavailable: 'Could not get your location right now, please try again later.',
    geo_timeout: 'Location request timed out, please try again later.',
    geo_generic_error: 'Could not get your location, please try again later.',

    load_failed_alert: 'Failed to load data. Please check that js/config.js has a valid Supabase URL / anon key.',
  },
};

let currentLang = localStorage.getItem(LANG_STORAGE_KEY) || 'zh';

function getLang() {
  return currentLang;
}

// key 找不到就退回中文版本、再找不到就直接顯示 key 本身（方便發現漏翻的項目）。
// vars 是 {{xxx}} 佔位符的替換值，值本身預期都是固定翻譯字串或數字，不是使用者輸入，
// 呼叫端不需要另外 escapeHtml。
function t(key, vars) {
  const dict = translations[currentLang] || translations.zh;
  let str = dict[key] ?? translations.zh[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.split(`{{${name}}}`).join(value);
    }
  }
  return str;
}

// 套用所有標了 data-i18n / data-i18n-placeholder 的固定文字元素。
// 動態產生的內容（popup、勾選表單、alert）不在這裡處理，由呼叫端各自用 t() 重繪。
function applyStaticTranslations() {
  document.documentElement.lang = currentLang === 'en' ? 'en' : 'zh-Hant';
  document.title = t('page_title');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

// 切換語言：存進 localStorage（下次造訪記得選過的語言）、重繪固定文字，
// 動態內容（勾選表單、已經畫出來的標記 popup）由呼叫端傳 onLangChanged 處理，
// 這個檔案本身不認得 map.js/ui.js 的內部狀態，保持職責單純。
function setLang(lang, onLangChanged) {
  currentLang = lang === 'en' ? 'en' : 'zh';
  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  } catch (err) {
    // 私人瀏覽模式等情況下 localStorage 可能整個不能用，語言切換這次還是會生效，
    // 只是重新整理頁面後會回到預設語言，不影響當下使用，故意不跳錯誤訊息。
  }
  applyStaticTranslations();
  if (typeof onLangChanged === 'function') onLangChanged();
}
