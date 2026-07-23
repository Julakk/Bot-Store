# 🤖 Bot Store Resmi — Ahmad Store

Bot Discord ini dikembangkan dan dikelola langsung oleh **Ahmad Store** untuk memberikan pengalaman order yang cepat, praktis, dan otomatis.

## ✨ Fitur

- ⚡ **Order Produk Mudah** — cukup klik button, tanpa ribet
- 💳 **Metode Pembayaran** — QRIS / DANA / GoPay
- 🔔 **Status Store Otomatis** — update online/offline langsung di Discord
- 📦 **Konfigurasi Fleksibel** — atur semua di `config.json`, sesuaikan dengan nama store kamu sendiri

## ⚙️ Setup

Semua pengaturan bot (nama store, channel ID, role ID, dll) dilakukan lewat file `config.json`. Sesuaikan isinya dengan kebutuhan store kamu sebelum bot dijalankan.

## 🔧 Update Bot — Fix & Improvement

### 1. Proteksi Admin untuk `/store`

Sebelumnya command `/store` bisa dipakai oleh member mana pun, padahal command ini mengirim mention `@everyone` dan mengubah status toko (Open/Close). Sekarang dibatasi khusus Admin, konsisten dengan command `/expired` dan `/sendhosting`:

- Ditambahkan `setDefaultMemberPermissions(Administrator)` pada definisi command.
- Ditambahkan pengecekan permission di kode — jika bukan Admin, bot akan membalas: "❌ Command ini hanya untuk Admin."

### 2. Error Handling untuk Semua Interaction

Sebelumnya, kalau terjadi error tak terduga (misal bot tidak punya izin kirim pesan ke channel tertentu), interaksi akan gagal tanpa keterangan ("This interaction failed") dan errornya cuma tercatat lewat `unhandledRejection`.

Sekarang seluruh handler `interactionCreate` dibungkus `try/catch`:

- Error dicatat jelas ke console (`❌ Error saat memproses interaction:`).
- User tetap mendapat balasan: "❌ Terjadi kesalahan saat memproses perintah." (via `reply` atau `followUp`, tergantung status interaksi).

### Catatan (belum di-fix, perlu tindakan manual)

- Banner `openBanner` & `closeBanner` di `/store` masih pakai signed CDN URL Discord yang expired ±24 jam. Perlu diganti ke attachment permanen atau CDN sendiri.

---

<div align="center">

© 2026 **Ahmad Store** — All Rights Reserved

</div>
