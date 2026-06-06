/**
 * ============================================================
 * SIRAH NABAWI DAILY BOT — Google Apps Script
 * PRD v2 | Production Ready | 1000+ Users
 * ============================================================
 *
 * SHEET STRUCTURE:
 *   USERS : user_id | chat_id | username | preferred_time | last_index | status | created_at
 *   SIRAH : id | fase | judul | cerita | hikmah | refleksi | sumber
 *   LOGS  : user_id | sirah_id | sent_at | status
 *
 * COLUMNS INDEX (0-based):
 *   USERS  → 0:user_id  1:chat_id  2:username  3:preferred_time  4:last_index  5:status  6:created_at
 *   SIRAH  → 0:id  1:fase  2:judul  3:cerita  4:hikmah  5:refleksi  6:sumber
 *   LOGS   → 0:user_id  1:sirah_id  2:sent_at  3:status
 */

// ─── COLUMN CONSTANTS ────────────────────────────────────────
const U = { USER_ID:0, CHAT_ID:1, USERNAME:2, PREF_TIME:3, LAST_IDX:4, STATUS:5, CREATED:6 };
const S = { ID:0, FASE:1, JUDUL:2, CERITA:3, HIKMAH:4, REFLEKSI:5 };
const L = { USER_ID:0, SIRAH_ID:1, SENT_AT:2, STATUS:3 };

// ─── SHEET NAMES ─────────────────────────────────────────────
const SHEET_USERS = 'USERS';
const SHEET_SIRAH = 'SIRAH';
const SHEET_LOGS  = 'LOGS';

// ─── HELPERS ─────────────────────────────────────────────────

function getToken() {
  return PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
}

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/**
 * Pad hour to "HH:00" format
 */
function normalizeTime(hour) {
  const h = parseInt(hour, 10);
  if (isNaN(h) || h < 0 || h > 23) return null;
  return (h < 10 ? '0' : '') + h + ':00';
}

/**
 * Current hour as "HH:00" — used for time matching
 */
function currentHour() {
  // Uses spreadsheet timezone automatically
  const now = new Date();
  const h = now.getHours();
  return (h < 10 ? '0' : '') + h + ':00';
}

// ─── TELEGRAM API ─────────────────────────────────────────────

/**
 * Send a Telegram message. Retries once on failure.
 */
function sendTelegram(chatId, text, retries) {
  retries = retries === undefined ? 1 : retries;
  const url = 'https://api.telegram.org/bot' + getToken() + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const resp = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(resp.getContentText());
    if (json.ok) return { ok: true };

    // Handle blocked / chat not found — no point retrying
    const fatal = [400, 403];
    if (fatal.indexOf(json.error_code) !== -1) return { ok: false, fatal: true, error: json.description };

    if (retries > 0) {
      Utilities.sleep(1500);
      return sendTelegram(chatId, text, retries - 1);
    }
    return { ok: false, error: json.description };

  } catch (e) {
    if (retries > 0) {
      Utilities.sleep(1500);
      return sendTelegram(chatId, text, retries - 1);
    }
    return { ok: false, error: e.message };
  }
}

// ─── SIRAH MESSAGE FORMATTER ──────────────────────────────────

function buildSirahMessage(row, index, total) {
  const fase    = row[S.FASE]    || '';
  const judul   = row[S.JUDUL]   || '';
  const cerita  = row[S.CERITA]  || '';
  const hikmah  = row[S.HIKMAH]  || '';
  const refleksi= row[S.REFLEKSI]|| '';

  return (
    '📖 <b>Sirah Hari Ini</b> [' + index + '/' + total + ']\n' +
    '<i>Fase: ' + fase + ' — ' + judul + '</i>\n\n' +
    cerita + '\n\n' +
    '💡 <b>Hikmah</b>\n' + hikmah + '\n\n' +
    '🤍 <b>Refleksi</b>\n' + refleksi
  );
}

// ─── WEBHOOK HANDLER ─────────────────────────────────────────

/**
 * Entry point for Telegram webhook POST requests.
 */
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);
    handleUpdate(update);
  } catch(err) {
    // Silently ignore malformed payloads
  }
  return ContentService.createTextOutput('OK');
}

function handleUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return;

  const chatId   = String(msg.chat.id);
  const userId   = String(msg.from.id);
  const username = msg.from.username || msg.from.first_name || 'User';
  const text     = msg.text.trim();

  if (text.startsWith('/start'))        cmdStart(userId, chatId, username);
  else if (text.startsWith('/jam'))     cmdJam(userId, chatId, text);
  else if (text.startsWith('/status'))  cmdStatus(userId, chatId);
  else if (text.startsWith('/stop'))    cmdStop(userId, chatId);
  else if (text.startsWith('/lanjut'))  cmdLanjut(userId, chatId);
  else if (text.startsWith('/ulang'))   cmdUlang(userId, chatId);
  else if (text.startsWith('/help'))    cmdHelp(chatId);
  // Unknown commands are silently ignored (security: no info leak)
}

// ─── COMMANDS ─────────────────────────────────────────────────

function cmdStart(userId, chatId, username) {
  const sheet = getSheet(SHEET_USERS);
  const data  = sheet.getDataRange().getValues(); // batch read

  // Check if already registered (skip header row 0)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][U.USER_ID]) === userId) {
      sendTelegram(chatId,
        'Selamat datang kembali, <b>' + username + '</b>! 👋\n\n' +
        'Kamu sudah terdaftar. Gunakan /status untuk melihat progress.\n\n' +
        'Ketik /help untuk daftar perintah.'
      );
      return;
    }
  }

  // Register new user
  const now = new Date().toISOString();
  sheet.appendRow([userId, chatId, username, '07:00', 0, 'active', now]);

  sendTelegram(chatId,
    'Assalamu\'alaikum, <b>' + username + '</b>! 🌙\n\n' +
    'Selamat datang di <b>Sirah Nabawi Daily</b>.\n\n' +
    'Setiap hari kamu akan menerima 1 kisah dari perjalanan hidup Nabi Muhammad ﷺ.\n\n' +
    '⏰ Default pengiriman: <b>07:00</b>\n' +
    'Ubah jam dengan: /jam 7 (atau jam lain, contoh: /jam 19)\n\n' +
    'Ketik /help untuk daftar perintah.\n\n' +
    'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'
  );
}

function cmdJam(userId, chatId, text) {
  // Extract number from "/jam 7" or "/jam7"
  const parts = text.replace('/jam', '').trim();
  const time  = normalizeTime(parts);

  if (!time) {
    sendTelegram(chatId,
      '⚠️ Format salah.\n\nContoh yang benar:\n/jam 7\n/jam 19\n\n(Gunakan angka 0–23)'
    );
    return;
  }

  const sheet = getSheet(SHEET_USERS);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][U.USER_ID]) === userId) {
      sheet.getRange(i + 1, U.PREF_TIME + 1).setValue(time);
      sendTelegram(chatId,
        '✅ Berhasil! Sirah akan dikirim setiap jam <b>' + time + '</b>.\n\n' +
        'Nantikan kisah penuh inspirasi besok ya! 🌟'
      );
      return;
    }
  }

  sendTelegram(chatId, '⚠️ Kamu belum terdaftar. Ketik /start dulu ya.');
}

function cmdStatus(userId, chatId) {
  const userSheet = getSheet(SHEET_USERS);
  const sirahSheet= getSheet(SHEET_SIRAH);
  const userData  = userSheet.getDataRange().getValues();
  const sirahData = sirahSheet.getDataRange().getValues();
  const total     = sirahData.length - 1; // subtract header

  for (let i = 1; i < userData.length; i++) {
    if (String(userData[i][U.USER_ID]) === userId) {
      const last    = parseInt(userData[i][U.LAST_IDX]) || 0;
      const status  = userData[i][U.STATUS];
      const time    = userData[i][U.PREF_TIME];
      const pct     = total > 0 ? Math.round((last / total) * 100) : 0;
      const bar     = buildProgressBar(pct);

      sendTelegram(chatId,
        '📊 <b>Status Sirah-mu</b>\n\n' +
        '▶️ Progress : ' + last + ' / ' + total + ' kisah\n' +
        '📈 ' + bar + ' ' + pct + '%\n' +
        '⏰ Jam kirim: ' + time + '\n' +
        '🔔 Status   : ' + (status === 'active' ? '✅ Aktif' : '⏸ Dijeda') + '\n\n' +
        (last >= total
          ? '🎉 Kamu telah menyelesaikan semua kisah Sirah! Alhamdulillah!'
          : 'Sisa ' + (total - last) + ' kisah lagi. Semangat! 💪')
      );
      return;
    }
  }

  sendTelegram(chatId, '⚠️ Kamu belum terdaftar. Ketik /start dulu ya.');
}

function cmdStop(userId, chatId) {
  setUserStatus(userId, chatId, 'paused',
    '⏸ Pengiriman Sirah <b>dijeda</b>.\n\nKetik /lanjut kapan saja untuk melanjutkan.'
  );
}

function cmdLanjut(userId, chatId) {
  setUserStatus(userId, chatId, 'active',
    '▶️ Pengiriman Sirah <b>dilanjutkan</b>! 🌟\n\nSirah berikutnya akan tiba sesuai jadwalmu.'
  );
}

function setUserStatus(userId, chatId, newStatus, successMsg) {
  const sheet = getSheet(SHEET_USERS);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][U.USER_ID]) === userId) {
      sheet.getRange(i + 1, U.STATUS + 1).setValue(newStatus);
      sendTelegram(chatId, successMsg);
      return;
    }
  }
  sendTelegram(chatId, '⚠️ Kamu belum terdaftar. Ketik /start dulu ya.');
}

function cmdUlang(userId, chatId) {
  const userSheet = getSheet(SHEET_USERS);
  const sirahSheet= getSheet(SHEET_SIRAH);
  const userData  = userSheet.getDataRange().getValues();
  const sirahData = sirahSheet.getDataRange().getValues();

  for (let i = 1; i < userData.length; i++) {
    if (String(userData[i][U.USER_ID]) === userId) {
      const lastIdx = parseInt(userData[i][U.LAST_IDX]) || 0;
      if (lastIdx === 0) {
        sendTelegram(chatId, 'ℹ️ Belum ada Sirah yang dikirim sebelumnya.');
        return;
      }
      const total   = sirahData.length - 1;
      const sirahRow= sirahData[lastIdx]; // lastIdx is 1-based, row 0 = header
      const msg     = buildSirahMessage(sirahRow, lastIdx, total);
      sendTelegram(chatId, '🔄 <b>Mengirim ulang Sirah #' + lastIdx + '</b>\n\n' + msg);
      return;
    }
  }
  sendTelegram(chatId, '⚠️ Kamu belum terdaftar. Ketik /start dulu ya.');
}

function cmdHelp(chatId) {
  sendTelegram(chatId,
    '📚 <b>Daftar Perintah Sirah Nabawi Daily</b>\n\n' +
    '/start — Daftar / sapa bot\n' +
    '/jam [angka] — Ubah jam kirim (contoh: /jam 7)\n' +
    '/status — Lihat progress & jadwal\n' +
    '/ulang — Kirim ulang Sirah terakhir\n' +
    '/stop — Jeda pengiriman\n' +
    '/lanjut — Lanjutkan pengiriman\n' +
    '/help — Tampilkan menu ini\n\n' +
    '🌙 "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain." — HR. Ahmad'
  );
}

// ─── DAILY DELIVERY ENGINE ────────────────────────────────────

/**
 * Main scheduler — triggered every 1 minute via time-driven trigger.
 * Batch reads all data once, processes all due users, batch writes updates.
 */
function dailyDelivery() {
  const now         = currentHour();
  const userSheet   = getSheet(SHEET_USERS);
  const sirahSheet  = getSheet(SHEET_SIRAH);
  const logsSheet   = getSheet(LOGS_SHEET_NAME());

  // ── 1. BATCH READ ──────────────────────────────────────────
  const allUsers  = userSheet.getDataRange().getValues();   // includes header
  const allSirah  = sirahSheet.getDataRange().getValues();  // includes header
  const allLogs   = logsSheet.getDataRange().getValues();   // includes header

  const totalSirah = allSirah.length - 1; // exclude header
  if (totalSirah === 0) return;

  // ── 2. BUILD SENT-TODAY SET (duplicate guard) ──────────────
  // Key: "userId_sirahId"
  const today      = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const sentToday  = {};
  for (let i = 1; i < allLogs.length; i++) {
    const logDate = String(allLogs[i][L.SENT_AT]).slice(0, 10);
    if (logDate === today) {
      const key = allLogs[i][L.USER_ID] + '_' + allLogs[i][L.SIRAH_ID];
      sentToday[key] = true;
    }
  }

  // ── 3. PROCESS USERS ──────────────────────────────────────
  const pendingUpdates = []; // { rowIndex, newLastIdx }
  const newLogs        = []; // rows to append to LOGS

  for (let i = 1; i < allUsers.length; i++) {
    const row      = allUsers[i];
    const userId   = String(row[U.USER_ID]);
    const chatId   = String(row[U.CHAT_ID]);
    const prefTime = String(row[U.PREF_TIME]);
    const lastIdx  = parseInt(row[U.LAST_IDX]) || 0;
    const status   = String(row[U.STATUS]);

    // ── Guard clauses ──────────────────────────────────────
    if (status !== 'active')        continue;
    if (prefTime !== now)           continue;
    if (lastIdx >= totalSirah)      continue; // completed all

    const nextIdx = lastIdx + 1;
    const dupKey  = userId + '_' + nextIdx;
    if (sentToday[dupKey])          continue; // already sent today

    // ── Get sirah (1-based index → array row nextIdx) ──────
    const sirahRow = allSirah[nextIdx]; // row 0 = header, row 1 = sirah #1
    if (!sirahRow) continue;

    const message = buildSirahMessage(sirahRow, nextIdx, totalSirah);
    const result  = sendTelegram(chatId, message);

    const logStatus = result.ok ? 'sent' : (result.fatal ? 'fatal' : 'failed');

    newLogs.push([userId, nextIdx, new Date().toISOString(), logStatus]);

    if (result.ok) {
      pendingUpdates.push({ rowIndex: i + 1, newLastIdx: nextIdx }); // +1 for 1-based sheet row
      sentToday[dupKey] = true; // prevent any in-memory duplicate
    }

    // Throttle: avoid hitting Telegram rate limit (30 msg/sec)
    // At 1000 users in one minute, sleep briefly between sends
    if (i % 25 === 0) Utilities.sleep(1000);
  }

  // ── 4. BATCH WRITE UPDATES ────────────────────────────────
  // Update last_index for each successful delivery
  for (let j = 0; j < pendingUpdates.length; j++) {
    const u = pendingUpdates[j];
    userSheet.getRange(u.rowIndex, U.LAST_IDX + 1).setValue(u.newLastIdx);
  }

  // Append all new logs in one operation
  if (newLogs.length > 0) {
    logsSheet.getRange(
      logsSheet.getLastRow() + 1,
      1,
      newLogs.length,
      newLogs[0].length
    ).setValues(newLogs);
  }
}

// Helper — avoids direct string in multiple places
function LOGS_SHEET_NAME() { return SHEET_LOGS; }

// ─── PROGRESS BAR HELPER ─────────────────────────────────────

function buildProgressBar(pct) {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

// ─── SETUP UTILITIES ─────────────────────────────────────────

/**
 * Run ONCE to register the webhook with Telegram.
 * Replace SCRIPT_URL with your deployed Apps Script web app URL.
 */
function setWebhook() {
  const token     = getToken();
  const scriptUrl = PropertiesService.getScriptProperties().getProperty('SCRIPT_URL');
  const url = 'https://api.telegram.org/bot' + token + '/setWebhook?url=' + scriptUrl;
  const resp = UrlFetchApp.fetch(url);
  Logger.log(resp.getContentText());
}

/**
 * Check current webhook info.
 */
function getWebhookInfo() {
  const resp = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + getToken() + '/getWebhookInfo'
  );
  Logger.log(resp.getContentText());
}

/**
 * Delete webhook (useful for debugging with polling).
 */
function deleteWebhook() {
  const resp = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + getToken() + '/deleteWebhook'
  );
  Logger.log(resp.getContentText());
}

/**
 * Initialize sheet headers. Run once during setup.
 */
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureHeaders(sheetName, headers) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }

  ensureHeaders(SHEET_USERS, ['user_id','chat_id','username','preferred_time','last_index','status','created_at']);
  ensureHeaders(SHEET_SIRAH, ['id','fase','judul','cerita','hikmah','refleksi','sumber']);
  ensureHeaders(SHEET_LOGS,  ['user_id','sirah_id','sent_at','status']);

  Logger.log('Sheets initialized successfully.');
}
