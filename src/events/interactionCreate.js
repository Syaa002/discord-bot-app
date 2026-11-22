const { EmbedBuilder } = require('discord.js');
const { handleVoiceInteraction, handleVoiceModalAndSelect } = require('../modules/voiceRooms');
const { handleTicketInteraction } = require('../modules/tickets');
const { handleGiveawayInteraction } = require('../modules/giveaways');
const { errorEmbed, successEmbed, COLORS, applyBanner } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.guild) return;

    // ===================================================================
    // 1. SLASH COMMANDS
    // ===================================================================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.executeSlash) return;

      // Cek Izin User
      if (command.userPermissions && command.userPermissions.length > 0) {
        const missing = command.userPermissions.filter(perm => !interaction.member.permissions.has(perm));
        if (missing.length > 0) {
          return interaction.reply({
            embeds: [errorEmbed('Izin Kurang', `Anda memerlukan izin: \`${missing.join(', ')}\``)],
            ephemeral: true
          });
        }
      }

      try {
        await command.executeSlash(interaction, client);
      } catch (err) {
        console.error(`[Slash Error] ${command.name}:`, err);
        const replyPayload = { embeds: [errorEmbed('Terjadi Kesalahan', 'Gagal memproses slash command.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      }
      return;
    }

    // ===================================================================
    // 2. HELP MENU DROPDOWN
    // ===================================================================
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_select_category') {
      const selected = interaction.values[0];
      const embed = new EmbedBuilder().setColor(COLORS.PRIMARY);

      if (selected === 'help_mod') {
        embed.setTitle('🛡️ Perintah Moderasi & Keamanan')
          .setDescription(
            '`!ban <user> [alasan]` — Banned user secara permanen\n' +
            '`!unban <id> [alasan]` — Buka status ban user\n' +
            '`!kick <user> [alasan]` — Keluarkan member dari server\n' +
            '`!timeout <user> <durasi> [alasan]` — Mute sementara (10m, 1h, 3d, 7d)\n' +
            '`!unmute <user>` — Cabut status timeout\n' +
            '`!delete <jumlah> [filter]` — Hapus pesan massal (alias: `!del`)\n' +
            '`!lockdown [channel]` — Kunci/buka channel untuk @everyone\n' +
            '`!slowmode <detik>` — Atur jeda slowmode channel\n' +
            '`!warn <user> <alasan>` — Berikan peringatan pada member\n' +
            '`!warnings <user>` — Cek riwayat peringatan member\n' +
            '`!role <add/remove> <user> <role>` — Tambah/cabut role\n' +
            '`!nick <user> <nama-baru>` — Ubah nickname member\n' +
            '`!auditlog` — 10 aksi audit log server terakhir\n' +
            '`!cleanup invite` — Hapus link invite yang sudah kedaluwarsa\n' +
            '`!report <user> <bukti> <detail>` — Laporan pelanggaran ke mod'
          );
      } else if (selected === 'help_info') {
        embed.setTitle('ℹ️ Perintah Informasi & Server')
          .setDescription(
            '`!help` — Menu panduan bantuan interaktif\n' +
            '`!snipe` — Lihat pesan yang baru saja dihapus\n' +
            '`!serverinfo` — Informasi statistik server\n' +
            '`!userinfo [user]` — Detail akun pengguna\n' +
            '`!avatar [user]` — Tampilkan foto avatar HD\n' +
            '`!roles` — Daftar seluruh role server\n' +
            '`!channels` — Ringkasan saluran server\n' +
            '`!invite` — Buat link invite sementara\n' +
            '`!ping` — Cek latensi bot dan WebSocket\n' +
            '`!uptime` — Lama waktu bot aktif online'
          );
      } else if (selected === 'help_community') {
        embed.setTitle('🧰 Perintah Komunitas & Interaksi')
          .setDescription(
            '`!poll "Pertanyaan" "Opsi 1" "Opsi 2"` — Polling reaksi\n' +
            '`!quote <message-id>` — Kutip pesan tertentu\n' +
            '`!suggest <ide>` — Kirim saran untuk di-vote komunitas\n' +
            '`!emoji <nama>` — Tampilkan custom emoji server\n' +
            '`!gif <pencarian>` — Cari animasi GIF GIPHY\n' +
            '`!fact` — Fakta acak menarik\n' +
            '`!thread create <nama>` — Buka thread diskusi baru'
          );
      } else if (selected === 'help_panels') {
        embed.setTitle('🎛️ Panel & Sistem Interaktif')
          .setDescription(
            '• **Temporary Voice Room** (`!voicepanel setup`): Saluran suara dinamis dengan 18 tombol kontrol.\n' +
            '• **Pusat Tiket Bantuan** (`!ticketpanel`): 5 jenis kategori bantuan & auto-transkrip.\n' +
            '• **Giveaway System** (`!giveaway`): Giveaway interaktif dengan tombol Enter/Leave.\n' +
            '• **Reaction Role** (`!reactionrole`): Panel pilih role via tombol klik.'
          );
      } else if (selected === 'help_admin') {
        embed.setTitle('⚙️ Perintah Developer & Administrasi')
          .setDescription(
            '`!config` — Lihat & atur pengaturan bot per server\n' +
            '`!sync` — Daftarkan slash commands ke Discord API\n' +
            '`!backup export` — Ekspor file backup JSON server\n' +
            '`!webhook create <nama>` — Buat webhook aman\n' +
            '`!status set <tipe> <teks>` — Ganti status aktivitas bot\n' +
            '`!reload <command>` — Hot-reload file perintah\n' +
            '`!logs` — Riwayat eksekusi command\n' +
            '`!shards` — Info sharding bot\n' +
            '`!dbping` — Tes kecepatan database JSON\n' +
            '`!kill` — Matikan bot secara aman\n' +
            '`!apitest` — Tes koneksi gateway & REST API'
          );
      }

      applyBanner(embed, interaction.guild.id, 'help');
      return interaction.update({ embeds: [embed] });
    }

    // ===================================================================
    // 3. REACTION ROLE BUTTON
    // ===================================================================
    if (interaction.isButton() && interaction.customId.startsWith('rr_')) {
      const roleId = interaction.customId.replace('rr_', '');
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({ content: '❌ Role tidak ditemukan.', ephemeral: true });
      }

      const member = interaction.member;
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role);
        return interaction.reply({ embeds: [successEmbed('Role Dicabut', `Role ${role} telah **dilepas** dari profil Anda.`)], ephemeral: true });
      } else {
        await member.roles.add(role);
        return interaction.reply({ embeds: [successEmbed('Role Diterima', `Role ${role} berhasil **ditambahkan** ke profil Anda.`)], ephemeral: true });
      }
    }

    // ===================================================================
    // 4. VOICE CONTROLS (18 TOMBOL, MODAL & SELECT MENU)
    // ===================================================================
    if (interaction.customId.startsWith('vc_')) {
      if (interaction.isModalSubmit() || interaction.isUserSelectMenu()) {
        await handleVoiceModalAndSelect(interaction);
      } else {
        await handleVoiceInteraction(interaction);
      }
      return;
    }

    // ===================================================================
    // 5. TICKET INTERACTIONS
    // ===================================================================
    if (interaction.customId.startsWith('ticket_')) {
      await handleTicketInteraction(interaction);
      return;
    }

    // ===================================================================
    // 6. GIVEAWAY INTERACTIONS
    // ===================================================================
    if (interaction.customId.startsWith('gw_')) {
      await handleGiveawayInteraction(interaction);
      return;
    }
  }
};
