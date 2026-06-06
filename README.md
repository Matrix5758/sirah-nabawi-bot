# 🕌 Sirah Nabawi Daily Bot

Bot Telegram untuk mengirim kisah-kisah Sirah Nabawi (Sejarah Nabi Muhammad ﷺ) secara harian ke ribuan pengguna. Dibangun dengan Google Apps Script + Google Sheets tanpa server.

## 🔧 Cara Setup

Lihat [`SETUP_GUIDE.md`](SETUP_GUIDE.md) untuk panduan lengkap dalam Bahasa Indonesia.

## 📁 Struktur File

| File | Keterangan |
|------|------------|
| `Code.gs` | Kode utama bot (Google Apps Script) |
| `sirah_bot_database_v2_200plus.csv` | Database 200+ kisah Sirah |
| `SETUP_GUIDE.md` | Panduan setup & konfigurasi |

## 🤖 Perintah Bot

| Perintah | Fungsi |
|----------|--------|
| `/start` | Daftar & sapa bot |
| `/jam [angka]` | Set jam pengiriman (contoh: `/jam 7`) |
| `/status` | Lihat progress & jadwal |
| `/ulang` | Kirim ulang Sirah terakhir |
| `/stop` | Jeda pengiriman |
| `/lanjut` | Lanjutkan pengiriman |
| `/help` | Tampilkan menu bantuan |

## 🏗️ Teknologi

- **Platform**: Google Apps Script
- **Database**: Google Sheets
- **API**: Telegram Bot API
- **Biaya**: Gratis (kuota Google Apps Script)

## ✨ Fitur

- 📚 200+ kisah Sirah terbagi per fase
- 🕐 Pengiriman otomatis sesuai jam pilihan
- 📊 Progress tracking dengan progress bar
- 🔄 Fitur kirim ulang kisah
- 💤 Pause/resume pengiriman
- 🛡️ Error handling untuk user yang memblokir bot

## 🤝 Kontribusi

Silakan buka issue atau PR jika ingin menambahkan kisah Sirah atau memperbaiki kode.

---

*"Dan Kami tidak mengutus engkau (Muhammad) melainkan sebagai rahmat bagi seluruh alam."*  
— QS. Al-Anbiya: 107