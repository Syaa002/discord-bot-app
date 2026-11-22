# Vespera • Discord Bot & Web Dashboard

Bot Discord serbaguna dengan arsitektur modular yang mendukung interaksi melalui awalan **`!`** maupun **Slash Command (`/`)**. Seluruh tampilan pesan Embed bot dan Web Dashboard mengusung identitas dan estetika modern elegan **Vespera (Server System • Core OS)**.

---

## 📋 Fitur-Fitur Bot

### 1. 🛡️ Moderasi & Keamanan Server
* `!help` — Menu panduan bantuan interaktif (berbasis Dropdown Select Menu).
* `!ban <user> [alasan]` — Banned permanen user dari server disertai catatan audit log.
* `!unban <user-id> [alasan]` — Membuka status pemblokiran user menggunakan ID akun.
* `!kick <user> [alasan]` — Mengeluarkan user dari server secara instan.
* `!timeout <user> <durasi> [alasan]` — Mute sementara (mendukung `10m`, `1h`, `3d`, `7d`).
* `!unmute <user>` — Menghapus status timeout sebelum durasi berakhir.
* `!delete <jumlah> [filter]` (alias: `!del`) — Hapus pesan massal (maksimal 100 pesan; filter `--bot`, `--user`, `--contains`).
* `!lockdown [channel] [unlock]` — Kunci atau buka kembali channel untuk `@everyone`.
* `!slowmode <detik> [channel]` — Atur jeda pengiriman pesan (0 = mati, maks 21600 detik).
* `!warn <user> <alasan>` — Catat pelanggaran ke database internal dan kirimkan DM link banding ke user.
* `!warnings <user>` — Cek riwayat peringatan user beserta timestamp & ID moderator.
* `!role <add/remove> <user> <role>` — Tambah atau cabut role dengan pengecekan hierarki izin yang aman.
* `!nick <user> <nama-baru>` — Mengubah nickname member di server (disertai batas panjang karakter).
* `!auditlog` — Menampilkan 10 aksi audit log moderasi server terakhir dalam embed.
* `!cleanup invite` — Hapus massal link invite server yang telah kedaluwarsa.
* `!report <user> <bukti-url> <detail>` — Laporan pelanggaran member ke tim moderator dengan auto-thread investigasi.

---

### 2. 🛡️ Sistem Proteksi Otomatis (Auto-Mod Engine)
* **Anti-Phishing & Scam Links**: Otomatis mendeteksi dan menghapus link scam berbahaya (penipuan Nitro gratis, steam scams), serta memberikan timeout otomatis 24 jam kepada pengirim.
* **Anti-Mass Mention**: Otomatis memblokir pesan dan memberikan timeout jika ada member yang spam tag `@everyone`, `@here`, atau tag banyak user sekaligus.
* **Anti-Invite Links**: Mencegah dan menghapus link invite server Discord lain yang disebarkan tanpa izin.
* **Blacklist System**: Pemblokiran pengguna dari penggunaan bot dengan masa kedaluwarsa otomatis.

---

### 3. ℹ️ Informasi & Utilitas Server
* `!snipe` — Menampilkan pesan teks terakhir yang baru saja dihapus di channel tersebut.
* `!serverinfo` — Menampilkan informasi statistik server (member, boost, tingkat verifikasi, channel, uptime).
* `!userinfo [user]` — Menampilkan detail akun pengguna (avatar, tanggal bergabung, role, status).
* `!avatar [user]` — Tampilkan foto avatar resolusi tinggi dan banner profil pengguna.
* `!roles` — Daftar seluruh role server lengkap dengan warna dan posisi hierarki.
* `!channels` — Ringkasan saluran server berdasarkan kategori teks dan voice.
* `!invite` — Buat link invite sementara sekali pakai (berlaku 7 hari).
* `!ping` — Cek latensi Discord API dan respon WebSocket.
* `!uptime` — Menampilkan lama waktu bot online sejak restart/deploy terakhir.

---

### 4. 🧰 Komunitas & Interaksi
* `!poll "Pertanyaan" "Opsi A" "Opsi B"` — Buat voting berbasis reaksi dengan timer.
* `!quote <message-id> [channel]` — Simpan dan kutip pesan tertentu ke embed publik.
* `!suggest <ide>` — Kirimkan saran pengembangan server ke channel saran untuk di-vote.
* `!emoji <nama>` — Cari dan tampilkan custom emoji server dalam ukuran besar.
* `!gif <kata-kunci>` — Cari animasi GIF aman dari GIPHY.
* `!fact` — Menampilkan fakta acak menarik seputar sains, sejarah, dan teknologi.
* `!thread create <nama> [durasi]` — Buka thread diskusi baru dengan opsi auto-archive.

---

### 5. 🎛️ Panel & Sistem Interaktif
* **🔊 Temporary Voice Rooms (TempVoice Interface)**:
  * Ruangan suara pribadi yang dibuat otomatis saat member bergabung ke saluran *Join to Create* (`!voicepanel setup`).
  * **Panel Pengendali Minimalis di Saluran Teks (`#interface`)**: Sematkan TempVoice Interface minimalis dengan 11 tombol ikon interaktif dan dukungan perintah `/voice` ke saluran teks seperti `#✨ | interface` via command `!voicepanel interface [#channel]` atau langsung dari Web Dashboard. Member yang berada di voice room dapat langsung mengontrol room mereka dari tombol tersebut.
  * **Pengaturan Ruangan**: `LIMIT`, `CHAT`, `NAME`, `PRIVACY` (Lock/Unlock), `BITRATE`, `RESET`.
  * **Izin & Akses**: `KICK`, `TRUST`, `UNTRUST`, `BLOCK`, `UNBLOCK`.
  * **Opsi Perintah Tambahan (`/voice`)**: `/voice claim`, `/voice transfer`, `/voice info`, `/voice invite`, `/voice waiting`, `/voice delete`.
  * **Auto-Delete**: Otomatis terhapus saat room kosong (0 member).
* **🎭 Reaction Role & Auto-Role**:
  * **Panel Tombol Reaction Role**: Buat panel tombol interaktif via Web Dashboard atau command `!reactionrole <role> <label> <deskripsi>`. Member cukup mengklik tombol untuk mengambil/melepas role secara mandiri.
  * **Sistem Auto-Role Tingkat Lanjut**: Pemberian role otomatis saat member baru bergabung dengan pemisah role user & bot, jeda waktu (delay), dan validasi hierarki role bot yang aman.
* **📢 Notifikasi Upload Konten (YouTube & TikTok)**:
  * Pemantau background otomatis yang mengirimkan notifikasi embed saat akun YouTube mengunggah video atau akun TikTok memposting video baru.
  * Dilengkapi antarmuka manajemen di Web Dashboard untuk menambah dan menghapus pemantauan feed YouTube dan TikTok.
* **🎫 Sistem Tiket Bantuan (5 Kategori)**:
  * Pembuatan tiket bantuan (Umum, Teknis, Laporan, Partner, Billing) dengan tombol tutup tiket dan auto-transkrip percakapan.
* **🎉 Sistem Giveaway Interaktif**:
  * Panel giveaway dengan tombol klik `Enter` / `Leave`, pengundian acak otomatis, dan pengumuman pemenang.
* **📜 Logging & Audit Server**:
  * Pencatatan riwayat terpisah per kategori: aktivitas moderasi, log pesan (edit & hapus), keluar-masuk member, serta event giveaway dan tiket.

---

### 6. ⚙️ Developer & Administrasi Bot
* `!sync` — Daftarkan dan perbarui Slash Commands ke Discord API.
* `!eval <code>` — Eksekusi script JS dalam sandbox aman (Khusus Owner).
* `!logs` — Menampilkan riwayat eksekusi perintah terakhir.
* `!config` — Panel pengaturan konfigurasi bot secara langsung di server.
* `!backup export` — Ekspor file backup data server ke file `.json`.
* `!webhook create <nama>` — Buat webhook aman otomatis.
* `!status set <tipe> <teks>` — Ubah status presence bot secara dinamis.
* `!reload <command>` — Muat ulang file perintah tanpa perlu mematikan bot (*hot-reload*).
* `!shards` — Pantau latensi dan status sharding bot.
* `!dbping` — Tes kecepatan baca/tulis database JSON lokal.
* `!kill` — Mematikan bot secara aman (*graceful shutdown*).
* `!whitelist add <guild-id>` — Daftarkan server khusus ke whitelist bot.
* `!apitest` — Validasi status koneksi API eksternal dan WebSocket.

---

### 7. ✨ Web Dashboard Privat (Tema Vespera • Core OS)
* **Akses Khusus Pemilik**: Dilindungi dengan autentikasi kata sandi privat dan pembatasan akses hanya dari perangkat lokal (`Localhost Only`) sehingga hanya Anda yang dapat membukanya.
* **Desain Eksklusif Vespera System**: Mengusung estetika palet warna rose-crimson elegan (`#FF758F`, `#EF233C`), aksen toska cyan (`#00F5D4`), dark slate modern, dan badge `CORE OS`.
* **Ringkasan Sistem Real-Time**: Pemantauan langsung status gateway WebSocket ping, jumlah server & member, uptime, serta pengontrol status aktivitas bot (*Presence Controller*).
* **Manajemen Auto-Mod Interaktif**: Tombol toggle untuk mengaktifkan/menonaktifkan Anti-Phishing, Anti-Mass Mention, dan Anti-Invite secara visual.
* **Visualisasi & Kontrol Temporary Voice**: Pengaturan saluran *Join to Create*, pengiriman TempVoice Interface minimalis langsung ke saluran teks seperti `#interface`, serta pratinjau matriks tombol interaktif.
* **Manajemen Feed Notifikasi YouTube & TikTok**: Tambah dan hapus ID channel YouTube dan akun TikTok yang dipantau langsung dari dashboard.
* **Pembuat Reaction Role & Auto-Role**: Pembuat panel Reaction Role (tombol interaktif, warna Discord, emoji) serta manajemen Auto-Role terperinci (user & bot).
* **Kustomisasi Banner & Disable Command**: Pengaturan banner embed global dan per-fitur dengan live preview serta manajemen pengaktifan/penonaktifan perintah per-server.
* **Pemantau Tiket, Giveaway & Server**: Memantau kategori tiket, melihat giveaway aktif beserta jumlah peserta, serta konfigurasi prefix & log moderasi.
