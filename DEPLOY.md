# DEPLOYMENT GUIDE - Sirah Nabawi Daily Bot

## Prasyarat
- Akun Google (Gmail)
- Akun Telegram

---

## STEP 1: Buat Bot Telegram

1. Buka Telegram, cari `@BotFather`
2. Kirim `/newbot`
3. Masukkan nama: `Sirah Nabawi Daily Bot` (atau terserah)
4. Masukkan username: `sirah_nabawi_bot` (atau terserah)
5. Simpan **BOT_TOKEN** yang diberikan (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

---

## STEP 2: Buat Google Sheet

1. Buka https://sheets.new
2. Buat 3 sheet (tab):
   - `USERS`
   - `SIRAH`
   - `LOGS`

### Sheet: USERS
Buat header di baris 1:
| user_id | chat_id | preferred_time | last_index | status | created_at |

### Sheet: SIRAH
1. Buka file `sirah_bot_database_v2_200plus.csv`
2. Copy semua data
3. Paste ke sheet SIRAH mulai dari cell A1

### Sheet: LOGS
Buat header di baris 1:
| user_id | sirah_id | sent_at | status |

### Copy SHEET_ID
- URL Google Sheet kamu: `https://docs.google.com/spreadsheets/d/XXXXX/edit`
- Yang `XXXXX` adalah SHEET_ID-nya. Copy itu.

---

## STEP 3: Setup Google Apps Script

1. Di Google Sheet, klik menu **Extensions > Apps Script**
2. Hapus kode default di `Code.gs`
3. Paste seluruh kode dari file `Code.gs` (yang saya buatkan)
4. Klik **Save** (atau Ctrl+S), beri nama project: `Sirah Bot`

### Set Properties
1. Di editor Apps Script, klik menu **Project Settings** (ikon gerigi)
2. Di bagian **Script Properties**, tambahkan 2 entries:
   - **Key**: `BOT_TOKEN` → **Value**: (token dari BotFather)
   - **Key**: `SHEET_ID` → **Value**: (ID Google Sheet dari Step 2)
3. Klik **Save script properties**

---

## STEP 4: Deploy Webhook

1. Di editor Apps Script, klik **Deploy > New deployment**
2. Pilih type: **Web app**
3. Set:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Klik **Deploy**
5. Izinkan permission (pertama kali)
6. Copy **Web App URL** (format: `https://script.google.com/macros/s/XXXXX/exec`)

### Set Webhook Telegram
Buka browser, kunjungi URL ini (ganti TOKEN dan WEBHOOK_URL):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WEBHOOK_URL>
```

Contoh:
```
https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://script.google.com/macros/s/XXXXX/exec
```

Jika berhasil, akan muncul: `{"ok": true, "result": true, "description": "Webhook was set"}`

---

## STEP 5: Setup Scheduler

1. Di editor Apps Script, klik icon jam (Triggers) di sidebar kiri
2. Klik **Add Trigger**
3. Set:
   - **Function**: `runScheduler`
   - **Time based event**: `Minute timer`
   - **Minute interval**: `Every minute`
4. Klik **Save**

---

## STEP 6: Test Bot

Buka Telegram, cari bot kamu, kirim:
- `/start` — registrasi
- `/jam 7` — atur jam pengiriman
- `/status` — lihat progress
- `/stop` — jeda
- `/lanjut` — lanjutkan
- `/ulang` — ulang cerita terakhir

Jika pengiriman otomatis tidak berjalan, cek **Executions** di Apps Script untuk melihat error.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot tidak merespon | Cek webhook: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` |
| Scheduler error | Cek Script Properties (BOT_TOKEN & SHEET_ID) |
| Data SIRAH kosong | Cek sheet SIRAH sudah terisi |
| Quota exceeded | Tunggu 24 jam, quota GAS harian |

---

## Quota Google Apps Script (Free Tier)
- Eksekusi: 90 menit/hari (cukup untuk 1000+ user)
- URL Fetch: 20.000/hari
- Baca/tulis sheet: cukup
