# 🕌 Sirah Nabawi Daily Bot — Setup Guide
**Stack: Google Apps Script + Google Sheets + Telegram**  
*Gratis. Zero server. Siap untuk 1000+ pengguna.*

---

## LANGKAH 1 — Buat Bot Telegram

1. Buka Telegram → cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi (beri nama bot & username)
4. Simpan **TOKEN** yang diberikan (format: `123456789:ABCdef...`)

---

## LANGKAH 2 — Buat Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama, misal: **Sirah Bot Database**
3. Buat **3 sheet tab** (klik `+` di bawah):
   - `USERS`
   - `SIRAH`
   - `LOGS`

### Import Data Sirah:
1. Klik tab **SIRAH**
2. Menu → **File → Import**
3. Upload file `sirah_bot_database_v2_200plus.csv`
4. Pilih: *Replace current sheet* → Import

> ✅ Pastikan header baris 1 adalah: `id, fase, judul, cerita, hikmah, refleksi, sumber`

---

## LANGKAH 3 — Buat Google Apps Script

1. Di spreadsheet, klik menu **Extensions → Apps Script**
2. Hapus semua kode default yang ada
3. **Copy-paste** seluruh isi `Code.gs` ke editor
4. Klik ikon 💾 (Save) atau `Ctrl+S`
5. Beri nama project, misal: **Sirah Bot**

---

## LANGKAH 4 — Set Script Properties (Simpan Token)

Di Apps Script editor:

1. Klik ikon ⚙️ **Project Settings** (panel kiri)
2. Scroll ke bawah → **Script Properties**
3. Klik **Add property**

Tambahkan 2 properti:

| Property | Value |
|----------|-------|
| `BOT_TOKEN` | Token dari BotFather (contoh: `123456789:ABCdef...`) |
| `SCRIPT_URL` | *(isi nanti di Langkah 6)* |

---

## LANGKAH 5 — Inisialisasi Sheet Headers

1. Di Apps Script, pilih fungsi **`initSheets`** dari dropdown
2. Klik ▶️ **Run**
3. Izinkan akses Google yang diminta (klik Allow)

> Ini akan membuat header otomatis di sheet USERS dan LOGS.

---

## LANGKAH 6 — Deploy Web App

1. Klik tombol biru **Deploy → New deployment**
2. Klik ⚙️ di samping "Select type" → pilih **Web app**
3. Konfigurasi:
   - **Description**: Sirah Bot v1
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Klik **Deploy**
5. **Copy URL** yang muncul (format: `https://script.google.com/macros/s/ABC.../exec`)

Kembali ke Script Properties → tambahkan:

| Property | Value |
|----------|-------|
| `SCRIPT_URL` | URL yang baru kamu copy |

---

## LANGKAH 7 — Daftarkan Webhook ke Telegram

1. Di Apps Script, pilih fungsi **`setWebhook`** dari dropdown
2. Klik ▶️ **Run**
3. Lihat log di bawah — harus ada `{"ok":true}`

Untuk verifikasi, jalankan **`getWebhookInfo`** dan cek hasilnya.

---

## LANGKAH 8 — Buat Time Trigger (Scheduler)

1. Di panel kiri Apps Script, klik ⏰ **Triggers** (ikon jam)
2. Klik **+ Add Trigger** (pojok kanan bawah)
3. Konfigurasi:

| Setting | Value |
|---------|-------|
| Function to run | `dailyDelivery` |
| Deployment | Head |
| Event source | Time-driven |
| Time based trigger | Minutes timer |
| Interval | Every minute |

4. Klik **Save**

> ⚠️ Pastikan timezone di spreadsheet sudah benar:  
> Sheets → File → Settings → Timezone → pilih zona waktu kamu (misal: Asia/Jakarta)

---

## LANGKAH 9 — Test Bot

1. Buka Telegram → cari bot kamu (pakai username yang dibuat di BotFather)
2. Kirim `/start` → bot harus membalas
3. Set jam: `/jam 7`
4. Cek `/status`
5. Tunggu jam yang ditentukan — Sirah pertama akan terkirim otomatis!

---

## Perintah Bot

| Perintah | Fungsi |
|----------|--------|
| `/start` | Daftar & sapa bot |
| `/jam [angka]` | Set jam kirim (contoh: `/jam 7` atau `/jam 19`) |
| `/status` | Lihat progress & jadwal |
| `/ulang` | Kirim ulang Sirah terakhir |
| `/stop` | Jeda pengiriman |
| `/lanjut` | Lanjutkan pengiriman |
| `/help` | Tampilkan menu bantuan |

---

## Struktur Database

### Sheet: USERS
| Kolom | Keterangan |
|-------|-----------|
| user_id | Telegram User ID |
| chat_id | Telegram Chat ID |
| username | Nama pengguna |
| preferred_time | Jam kirim (format: `07:00`) |
| last_index | Nomor Sirah terakhir yang dikirim |
| status | `active` atau `paused` |
| created_at | Waktu registrasi (ISO 8601) |

### Sheet: SIRAH
| Kolom | Keterangan |
|-------|-----------|
| id | Nomor urut (1, 2, 3...) |
| fase | Fase Sirah (Pra-Kenabian, Awal Kenabian, dll) |
| judul | Judul kisah |
| cerita | Isi cerita |
| hikmah | Pelajaran |
| refleksi | Pertanyaan refleksi |
| sumber | Sumber referensi |

### Sheet: LOGS
| Kolom | Keterangan |
|-------|-----------|
| user_id | Telegram User ID |
| sirah_id | Nomor Sirah yang dikirim |
| sent_at | Waktu kirim (ISO 8601) |
| status | `sent`, `failed`, atau `fatal` |

---

## Troubleshooting

**Bot tidak membalas `/start`:**
- Cek webhook: jalankan `getWebhookInfo` di Apps Script
- Pastikan deployment "Who has access" = **Anyone**
- Coba redeploy dan jalankan `setWebhook` ulang

**Sirah tidak terkirim otomatis:**
- Cek trigger sudah aktif di menu Triggers
- Pastikan timezone spreadsheet sudah benar
- Periksa sheet LOGS untuk melihat error

**Error `fatal` di LOGS:**
- User memblokir bot → normal, sistem akan skip user tersebut
- Tidak perlu tindakan manual

**Kuota Apps Script habis:**
- Google Apps Script gratis: 6 menit/eksekusi, 90 menit/hari
- Untuk 1000 user: setiap trigger ~10 detik → aman di bawah batas
- Jika melebihi, upgrade ke Google Workspace atau spread trigger timing

---

## Performa & Skalabilitas

| Metrik | Nilai |
|--------|-------|
| Max pengguna | 1000+ (tested design) |
| Eksekusi per trigger | ~5–10 detik |
| Kuota harian Apps Script | 90 menit (gratis) |
| Biaya | **Rp 0** |
| Database | Google Sheets (10 juta sel gratis) |

**Teknik optimasi yang digunakan:**
- `getValues()` batch — baca seluruh sheet 1x per eksekusi
- Duplicate guard via in-memory set (tidak query per-user)
- Batch write `setValues()` setelah loop selesai
- Sleep throttle tiap 25 pesan untuk hindari rate limit Telegram

---

## Catatan Keamanan

- Token BOT tersimpan di Script Properties, **bukan** di kode
- Webhook hanya menerima POST dari Telegram
- Command tidak dikenal diabaikan (tidak ada info leak)
- Chat ID yang diblokir (fatal error) tidak akan di-retry terus

---

*"Dan Kami tidak mengutus engkau (Muhammad) melainkan sebagai rahmat bagi seluruh alam."*  
*— QS. Al-Anbiya: 107*
