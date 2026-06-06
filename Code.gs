// ============================================================
// SIRAH NABAWI DAILY TELEGRAM BOT
// Stack: Google Apps Script + Google Sheets + Telegram Bot API
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
function getConfig_() {
  return {
    sheetId: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
    botToken: PropertiesService.getScriptProperties().getProperty('BOT_TOKEN'),
  };
}

// ============================================================
// TELEGRAM API
// ============================================================
function sendTelegram_(chatId, text) {
  var config = getConfig_();
  var url = 'https://api.telegram.org/bot' + config.botToken + '/sendMessage';
  var payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  for (var i = 0; i < 2; i++) {
    try {
      var res = UrlFetchApp.fetch(url, options);
      var json = JSON.parse(res.getContentText());
      if (json.ok) return json;
    } catch (e) {
      if (i === 1) {
        console.error('Telegram send failed for ' + chatId + ': ' + e.toString());
      }
    }
  }
  return null;
}

// ============================================================
// SHEET OPERATIONS
// ============================================================
function getSheet_(name) {
  var config = getConfig_();
  var ss = SpreadsheetApp.openById(config.sheetId);
  return ss.getSheetByName(name);
}

function normalizeTime_(val) {
  if (val instanceof Date) {
    return ('0' + val.getHours()).slice(-2) + ':' + ('0' + val.getMinutes()).slice(-2);
  }
  return String(val);
}

function normalizeIndex_(val) {
  if (val instanceof Date) return 0;
  var n = Number(val);
  return isNaN(n) ? 0 : Math.floor(n);
}

function getAllUsers_() {
  var sheet = getSheet_('USERS');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      user_id: row[0],
      chat_id: row[1],
      preferred_time: normalizeTime_(row[2]),
      last_index: normalizeIndex_(row[3]),
      status: row[4],
      created_at: row[5],
    };
  });
}

function getUserByChatId_(chatId) {
  var sheet = getSheet_('USERS');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var chatIdStr = String(chatId);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === chatIdStr) {
      return {
        row: i + 1,
        user_id: data[i][0],
        chat_id: data[i][1],
        preferred_time: normalizeTime_(data[i][2]),
        last_index: normalizeIndex_(data[i][3]),
        status: data[i][4],
        created_at: data[i][5],
      };
    }
  }
  return null;
}

function addUser_(chatId, userId) {
  var sheet = getSheet_('USERS');
  if (!sheet) return;
  var lastRow = sheet.getLastRow() + 1;
  sheet.appendRow([userId, chatId, '', 0, 'active', new Date().toISOString()]);
  sheet.getRange(lastRow, 4).setNumberFormat('0');
}

function updateUserField_(row, colIndex, value) {
  var sheet = getSheet_('USERS');
  if (!sheet) return false;
  sheet.getRange(row, colIndex).setValue(value);
  return true;
}

function getSirahByIndex_(index) {
  var sheet = getSheet_('SIRAH');
  if (!sheet || index < 1) return null;
  var row = index + 1;
  if (row > sheet.getLastRow()) return null;
  var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    id: data[0],
    fase: data[1],
    judul: data[2],
    cerita: data[3],
    hikmah: data[4],
    refleksi: data[5],
    sumber: data[6],
  };
}

function getTotalSirah_() {
  var sheet = getSheet_('SIRAH');
  if (!sheet) return 0;
  return Math.max(0, sheet.getLastRow() - 1);
}

// ============================================================
// MESSAGE FORMAT
// ============================================================
function formatSirahMessage(sirah) {
  var lines = [];
  lines.push('\ud83d\udcd6 <b>Sirah Hari Ini</b>');
  lines.push('<i>' + sirah.fase + ' \u2014 ' + sirah.judul + '</i>');
  lines.push('');
  lines.push(sirah.cerita);
  lines.push('');
  lines.push('\ud83d\udca1 <b>Hikmah</b>');
  lines.push(sirah.hikmah);
  lines.push('');
  lines.push('\ud83e\udd0d <b>Refleksi</b>');
  lines.push(sirah.refleksi);
  lines.push('');
  lines.push('\u2501'.repeat(20));
  lines.push('\ud83d\udcda Sumber: ' + sirah.sumber);
  return lines.join('\n');
}

function parseCommand(text) {
  if (!text || text[0] !== '/') return null;
  var parts = text.split(' ');
  return {
    cmd: parts[0].toLowerCase(),
    args: parts.slice(1).join(' ').trim(),
  };
}

// ============================================================
// COMMAND HANDLERS
// ============================================================
function handleStart(chatId, userId) {
  var user = getUserByChatId_(chatId);
  if (user) {
    sendTelegram_(chatId, 'Kamu sudah terdaftar! Gunakan /jam untuk mengatur waktu pengiriman.');
    return;
  }
  addUser_(chatId, userId);
  sendTelegram_(chatId, 'Assalamu\'alaikum! \ud83c\udf19\n\nSelamat datang di <b>Sirah Nabawi Daily Bot</b>.\nKamu akan menerima satu cerita Sirah setiap hari.\n\nSilakan atur jam pengiriman:\n<code>/jam 7</code> (pagi)\n<code>/jam 19</code> (malam)');
}

function handleJam(chatId, args, userId) {
  var hour = parseInt(args, 10);
  if (isNaN(hour) || hour < 0 || hour > 23) {
    sendTelegram_(chatId, 'Format salah. Gunakan angka 0-23.\nContoh: <code>/jam 7</code> atau <code>/jam 19</code>');
    return;
  }
  var time = ('0' + hour).slice(-2) + ':00';

  var user = getUserByChatId_(chatId);
  if (!user) {
    addUser_(chatId, userId);
    user = getUserByChatId_(chatId);
  }

  var sheet = getSheet_('USERS');
  sheet.getRange(user.row, 3).setNumberFormat('@STRING@').setValue(time);
  sendTelegram_(chatId, '\u2705 Waktu diatur! Kamu akan menerima Sirah setiap jam ' + hour + ':00.');
}

function handleStatus(chatId) {
  var user = getUserByChatId_(chatId);
  if (!user) {
    sendTelegram_(chatId, 'Kamu belum terdaftar. Ketik /start untuk mendaftar.');
    return;
  }
  var total = getTotalSirah_();
  var current = user.last_index || 0;
  var pct = total > 0 ? Math.round((current / total) * 100) : 0;

  var msg = '\ud83d\udcca <b>Status Bacaan</b>\n\n';
  msg += 'Cerita ke: ' + current + ' / ' + total + '\n';
  msg += 'Progress: ' + pct + '%\n';
  msg += 'Status: ' + (user.status === 'active' ? '\u2705 Aktif' : '\u23f8\ufe0f Dijeda') + '\n';
  msg += 'Waktu: ' + (user.preferred_time || 'Belum diatur') + '\n\n';
  msg += 'Gunakan /jam untuk mengatur waktu.';

  sendTelegram_(chatId, msg);
}

function handleStop(chatId) {
  var user = getUserByChatId_(chatId);
  if (!user) {
    sendTelegram_(chatId, 'Kamu belum terdaftar. Ketik /start untuk mendaftar.');
    return;
  }
  updateUserField_(user.row, 5, 'paused');
  sendTelegram_(chatId, '\u23f8\ufe0f Bot dijeda. Ketik /lanjut untuk melanjutkan.');
}

function handleLanjut(chatId) {
  var user = getUserByChatId_(chatId);
  if (!user) {
    sendTelegram_(chatId, 'Kamu belum terdaftar. Ketik /start untuk mendaftar.');
    return;
  }
  updateUserField_(user.row, 5, 'active');
  sendTelegram_(chatId, '\u2705 Bot dilanjutkan! Kamu akan menerima Sirah sesuai jadwal.');
}

function handleUlang(chatId) {
  var user = getUserByChatId_(chatId);
  if (!user || !user.last_index || user.last_index < 1) {
    sendTelegram_(chatId, 'Belum ada cerita yang dikirim. Tunggu jadwal berikutnya.');
    return;
  }
  var sirah = getSirahByIndex_(user.last_index);
  if (!sirah) {
    sendTelegram_(chatId, 'Data tidak ditemukan.');
    return;
  }
  sendTelegram_(chatId, formatSirahMessage(sirah));
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================
function doPost(e) {
  try {
    var update = JSON.parse(e.postData.contents);

    if (update.message) {
      var msg = update.message;
      var chatId = msg.chat.id;
      var userId = msg.from.id;
      var text = msg.text || '';

      var parsed = parseCommand(text);
      if (!parsed) return;

      if (parsed.cmd === '/start') {
        handleStart(chatId, userId);
      } else if (parsed.cmd === '/jam') {
        handleJam(chatId, parsed.args, userId);
      } else if (parsed.cmd === '/status') {
        handleStatus(chatId);
      } else if (parsed.cmd === '/stop') {
        handleStop(chatId);
      } else if (parsed.cmd === '/lanjut') {
        handleLanjut(chatId);
      } else if (parsed.cmd === '/ulang') {
        handleUlang(chatId);
      }
    }
  } catch (err) {
    console.error('Error in doPost: ' + err.toString());
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Sirah Bot is running.');
}

// ============================================================
// SCHEDULER DELIVERY ENGINE
// ============================================================
function runScheduler() {
  var config = getConfig_();
  if (!config.sheetId || !config.botToken) {
    console.error('Missing configuration: SHEET_ID or BOT_TOKEN');
    return;
  }

  var now = new Date();
  var currentHour = ('0' + now.getHours()).slice(-2);
  var currentMinute = ('0' + now.getMinutes()).slice(-2);
  var currentTime = currentHour + ':' + currentMinute;

  var ss = SpreadsheetApp.openById(config.sheetId);
  var usersSheet = ss.getSheetByName('USERS');
  var sirahSheet = ss.getSheetByName('SIRAH');
  var logsSheet = ss.getSheetByName('LOGS');

  if (!usersSheet || !sirahSheet || !logsSheet) {
    console.error('Missing required sheets: USERS, SIRAH, LOGS');
    return;
  }

  var usersData = usersSheet.getDataRange().getValues();
  var sirahData = sirahSheet.getDataRange().getValues();
  var totalSirah = sirahData.length - 1;

  if (totalSirah < 1) {
    console.error('No Sirah data found in SIRAH sheet');
    return;
  }

  var toSend = [];
  var logs = [];

  for (var i = 1; i < usersData.length; i++) {
    var row = usersData[i];
    var chatId = row[1];
    var preferredTime = normalizeTime_(row[2]);
    var lastIndex = normalizeIndex_(row[3]);
    var status = row[4];

    if (status !== 'active') continue;
    if (preferredTime !== currentTime) continue;
    if (lastIndex >= totalSirah) continue;

    var nextIndex = lastIndex + 1;
    var sirahRow = sirahData[nextIndex];
    if (!sirahRow) continue;

    toSend.push({
      rowIndex: i + 1,
      chatId: chatId,
      userId: row[0],
      sirahId: sirahRow[0],
      nextIndex: nextIndex,
      sirah: {
        fase: sirahRow[1],
        judul: sirahRow[2],
        cerita: sirahRow[3],
        hikmah: sirahRow[4],
        refleksi: sirahRow[5],
        sumber: sirahRow[6],
      },
    });
  }

  var sentCount = 0;

  for (var j = 0; j < toSend.length; j++) {
    var item = toSend[j];
    var message = formatSirahMessage(item.sirah);
    var result = sendTelegram_(item.chatId, message);

    if (result && result.ok) {
      usersSheet.getRange(item.rowIndex, 4).setValue(item.nextIndex);
      logs.push([item.userId, item.sirahId, new Date().toISOString(), 'sent']);
      sentCount++;
    } else {
      logs.push([item.userId, item.sirahId, new Date().toISOString(), 'failed']);
    }

    Utilities.sleep(200);
  }

  if (logs.length > 0) {
    var logRange = logsSheet.getRange(logsSheet.getLastRow() + 1, 1, logs.length, 4);
    logRange.setValues(logs);
  }

  console.log('[Scheduler ' + currentTime + '] ' + toSend.length + ' targeted, ' + sentCount + ' sent');
}
