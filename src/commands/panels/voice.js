const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../../database/jsonDb');
const { COLORS, successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'voice',
  description: 'Kelola temporary voice room Anda dengan perintah /voice',
  category: 'panels',
  usage: '!voice <name|limit|lock|unlock|kick|trust|untrust|block|unblock|bitrate|reset|claim|transfer|info|invite|waiting>',
  aliases: ['vc'],
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers],
  slashData: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Kelola temporary voice room Anda')
    .addSubcommand(sub =>
      sub.setName('name')
        .setDescription('Ubah nama temporary voice room Anda')
        .addStringOption(opt => opt.setName('nama').setDescription('Nama baru ruangan').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('limit')
        .setDescription('Atur batas kuota member (0 = tanpa batas)')
        .addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah maksimal (0 - 99)').setMinValue(0).setMaxValue(99).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('lock')
        .setDescription('Kunci voice room agar member lain tidak bisa masuk')
    )
    .addSubcommand(sub =>
      sub.setName('unlock')
        .setDescription('Buka kunci voice room untuk umum')
    )
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Keluarkan member dari voice room')
        .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dikeluarkan').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('trust')
        .setDescription('Beri izin khusus pada member trusted')
        .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin di-trust').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('untrust')
        .setDescription('Cabut status trusted member')
        .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin di-untrust').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('block')
        .setDescription('Blokir member agar tidak bisa masuk room')
        .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin diblokir').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('unblock')
        .setDescription('Buka blokir member')
        .addUserOption(opt => opt.setName('target').setDescription('Member yang ingin dibuka blokirnya').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('bitrate')
        .setDescription('Atur bitrate audio dalam kbps (8 - 384)')
        .addIntegerOption(opt => opt.setName('kbps').setDescription('Bitrate (kbps)').setMinValue(8).setMaxValue(384).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset pengaturan voice room ke kondisi awal')
    )
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('Klaim kepemilikan ruangan jika pemilik asli sudah keluar')
    )
    .addSubcommand(sub =>
      sub.setName('transfer')
        .setDescription('Serahkan kepemilikan ruangan kepada member lain')
        .addUserOption(opt => opt.setName('target').setDescription('Pemilik baru').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Lihat status & rincian temporary voice room')
    )
    .addSubcommand(sub =>
      sub.setName('invite')
        .setDescription('Buat link undangan instan ke room Anda')
    )
    .addSubcommand(sub =>
      sub.setName('waiting')
        .setDescription('Toggle ruang tunggu (mute saat baru masuk)')
    ),

  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();
    const guild = message.guild;
    const member = message.member;
    const guildData = db.getGuild(guild.id);

    const userVoiceId = member.voice.channelId;
    if (!userVoiceId || !guildData.temporaryVoiceRooms[userVoiceId]) {
      return message.reply({ embeds: [errorEmbed('Bukan di Voice Room', 'Anda harus berada di dalam temporary voice room Anda untuk menggunakan perintah ini.')] });
    }

    const voiceChannel = guild.channels.cache.get(userVoiceId);
    const roomData = guildData.temporaryVoiceRooms[userVoiceId];
    const isOwner = roomData.ownerId === member.id;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (sub === 'claim') {
      const currentOwnerInRoom = voiceChannel.members.has(roomData.ownerId);
      if (currentOwnerInRoom && !isOwner) {
        return message.reply({ embeds: [errorEmbed('Gagal Klaim', 'Pemilik ruangan masih berada di dalam channel ini.')] });
      }
      if (isOwner) {
        return message.reply({ embeds: [errorEmbed('Informasi', 'Anda sudah menjadi pemilik ruangan ini.')] });
      }
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].ownerId = member.id;
      });
      await voiceChannel.permissionOverwrites.edit(member.id, {
        ManageChannels: true, MoveMembers: true, Connect: true, Speak: true
      });
      return message.reply({ embeds: [successEmbed('Kepemilikan Baru', `👑 Selamat ${member}, Anda sekarang adalah pemilik baru ruangan ini!`)] });
    }

    if (sub === 'info') {
      const ownerUser = await message.client.users.fetch(roomData.ownerId).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`ℹ️ Info Ruangan: ${voiceChannel.name}`)
        .addFields(
          { name: '👑 Pemilik', value: ownerUser ? `${ownerUser.tag} (\`${ownerUser.id}\`)` : 'Tidak diketahui', inline: true },
          { name: '👥 Member Saat Ini', value: `${voiceChannel.members.size}/${voiceChannel.userLimit || 'Tak terbatas'}`, inline: true },
          { name: '📶 Bitrate', value: `${voiceChannel.bitrate / 1000} kbps`, inline: true },
          { name: '⏳ Waiting Room', value: roomData.waitingRoom ? 'Aktif' : 'Non-aktif', inline: true },
          { name: '🛡️ Trusted', value: roomData.trusted.length > 0 ? roomData.trusted.map(id => `<@${id}>`).join(', ') : 'Tidak ada' },
          { name: '🚫 Blocked', value: roomData.blocked.length > 0 ? roomData.blocked.map(id => `<@${id}>`).join(', ') : 'Tidak ada' }
        );
      return message.reply({ embeds: [embed] });
    }

    if (!isOwner && !isAdmin) {
      return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya pemilik ruangan atau Admin yang dapat mengubah setelan voice room.')] });
    }

    if (sub === 'name') {
      const newName = args.slice(1).join(' ');
      if (!newName) return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan: `!voice name <nama baru>`')] });
      await voiceChannel.setName(newName.substring(0, 32));
      return message.reply({ embeds: [successEmbed('Nama Diubah', `🏷️ Nama ruangan berhasil diubah menjadi: **${newName.substring(0, 32)}**`)] });
    }

    if (sub === 'limit') {
      const val = parseInt(args[1], 10);
      if (isNaN(val) || val < 0 || val > 99) return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan angka antara `0` (tanpa batas) sampai `99`.')] });
      await voiceChannel.setUserLimit(val);
      return message.reply({ embeds: [successEmbed('Batas Diatur', `👥 Batas member diatur menjadi: **${val === 0 ? 'Tanpa Batas' : val}**`)] });
    }

    if (sub === 'lock') {
      await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
      return message.reply({ embeds: [successEmbed('Ruangan Dikunci', '🔒 Ruangan sekarang terkunci untuk umum.')] });
    }

    if (sub === 'unlock') {
      await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: true });
      return message.reply({ embeds: [successEmbed('Ruangan Dibuka', '🔓 Ruangan sekarang terbuka untuk semua member.')] });
    }

    if (sub === 'kick') {
      const target = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply({ embeds: [errorEmbed('Member Tidak Valid', 'Tag member yang ingin dikeluarkan.')] });
      if (target.voice.channelId === voiceChannel.id) {
        await target.voice.disconnect();
        return message.reply({ embeds: [successEmbed('Member Dikeluarkan', `📞 ${target} telah dikeluarkan dari voice room.`)] });
      }
      return message.reply({ embeds: [errorEmbed('Tidak di Room', 'Member tersebut tidak sedang berada di dalam room ini.')] });
    }

    if (sub === 'trust') {
      const target = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply({ embeds: [errorEmbed('Member Tidak Valid', 'Tag member yang ingin diberi status trusted.')] });
      await voiceChannel.permissionOverwrites.edit(target.id, { Connect: true, Speak: true });
      db.updateGuild(guild.id, data => {
        if (!data.temporaryVoiceRooms[voiceChannel.id].trusted.includes(target.id)) {
          data.temporaryVoiceRooms[voiceChannel.id].trusted.push(target.id);
        }
      });
      return message.reply({ embeds: [successEmbed('Trusted Member', `👤 ${target} sekarang menjadi **Trusted Member**.`)] });
    }

    if (sub === 'untrust') {
      const target = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply({ embeds: [errorEmbed('Member Tidak Valid', 'Tag member yang ingin dicabut status trusted-nya.')] });
      await voiceChannel.permissionOverwrites.delete(target.id);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].trusted = data.temporaryVoiceRooms[voiceChannel.id].trusted.filter(id => id !== target.id);
      });
      return message.reply({ embeds: [successEmbed('Status Dicabut', `👤 Status trusted ${target} telah dicabut.`)] });
    }

    if (sub === 'block') {
      const target = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply({ embeds: [errorEmbed('Member Tidak Valid', 'Tag member yang ingin diblokir.')] });
      await voiceChannel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
      if (target.voice.channelId === voiceChannel.id) {
        await target.voice.disconnect();
      }
      db.updateGuild(guild.id, data => {
        if (!data.temporaryVoiceRooms[voiceChannel.id].blocked.includes(target.id)) {
          data.temporaryVoiceRooms[voiceChannel.id].blocked.push(target.id);
        }
      });
      return message.reply({ embeds: [successEmbed('Member Diblokir', `🚫 ${target} telah diblokir dari room ini.`)] });
    }

    if (sub === 'unblock') {
      const target = message.mentions.members.first() || guild.members.cache.get(args[1]);
      if (!target) return message.reply({ embeds: [errorEmbed('Member Tidak Valid', 'Tag member yang ingin dibuka blokirnya.')] });
      await voiceChannel.permissionOverwrites.delete(target.id);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].blocked = data.temporaryVoiceRooms[voiceChannel.id].blocked.filter(id => id !== target.id);
      });
      return message.reply({ embeds: [successEmbed('Blokir Dibuka', `🔓 Blokir terhadap ${target} telah dibuka.`)] });
    }

    if (sub === 'bitrate') {
      const val = parseInt(args[1], 10);
      if (isNaN(val) || val < 8 || val > 384) return message.reply({ embeds: [errorEmbed('Format Salah', 'Bitrate harus antara 8 sampai 384 kbps.')] });
      try {
        await voiceChannel.setBitrate(val * 1000);
        return message.reply({ embeds: [successEmbed('Bitrate Diatur', `📶 Bitrate diatur menjadi: **${val} kbps**`)] });
      } catch {
        return message.reply({ embeds: [errorEmbed('Gagal', 'Bitrate terlalu tinggi untuk tier server saat ini.')] });
      }
    }

    if (sub === 'reset') {
      await voiceChannel.edit({
        name: `🔊 ${member.displayName}'s Room`,
        userLimit: 0,
        bitrate: 64000
      });
      await voiceChannel.permissionOverwrites.set([
        { id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }
      ]);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].trusted = [];
        data.temporaryVoiceRooms[voiceChannel.id].blocked = [];
        data.temporaryVoiceRooms[voiceChannel.id].waitingRoom = false;
      });
      return message.reply({ embeds: [successEmbed('Pengaturan Direset', '⚙️ Seluruh pengaturan ruangan telah direset ke default.')] });
    }

    if (sub === 'invite') {
      const invite = await voiceChannel.createInvite({ maxAge: 3600, maxUses: 5 });
      return message.reply({ embeds: [successEmbed('Undangan Dibuat', `📞 Link undangan ke room ini (berlaku 1 jam):\n${invite.url}`)] });
    }

    if (sub === 'waiting') {
      const currentWait = roomData.waitingRoom;
      const newWait = !currentWait;
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].waitingRoom = newWait;
      });
      if (newWait) {
        await voiceChannel.permissionOverwrites.edit(guild.id, { Speak: false });
      } else {
        await voiceChannel.permissionOverwrites.edit(guild.id, { Speak: null });
      }
      return message.reply({ embeds: [successEmbed('Waiting Room', newWait ? '⏳ **Waiting Room Aktif:** Member baru tidak dapat berbicara.' : '⏳ Waiting Room dinonaktifkan.')] });
    }

    return message.reply({ embeds: [errorEmbed('Subcommand Tidak Dikenal', `Gunakan: \`${this.usage}\``)] });
  },

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const member = interaction.member;
    const guildData = db.getGuild(guild.id);

    const userVoiceId = member.voice.channelId;
    if (!userVoiceId || !guildData.temporaryVoiceRooms[userVoiceId]) {
      return interaction.reply({
        embeds: [errorEmbed('Bukan di Voice Room', 'Anda harus berada di dalam temporary voice room Anda untuk menggunakan perintah ini.')],
        ephemeral: true
      });
    }

    const voiceChannel = guild.channels.cache.get(userVoiceId);
    const roomData = guildData.temporaryVoiceRooms[userVoiceId];
    const isOwner = roomData.ownerId === member.id;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (sub === 'claim') {
      const currentOwnerInRoom = voiceChannel.members.has(roomData.ownerId);
      if (currentOwnerInRoom && !isOwner) {
        return interaction.reply({ embeds: [errorEmbed('Gagal Klaim', 'Pemilik ruangan masih berada di dalam channel ini.')], ephemeral: true });
      }
      if (isOwner) {
        return interaction.reply({ embeds: [errorEmbed('Informasi', 'Anda sudah menjadi pemilik ruangan ini.')], ephemeral: true });
      }
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].ownerId = member.id;
      });
      await voiceChannel.permissionOverwrites.edit(member.id, {
        ManageChannels: true, MoveMembers: true, Connect: true, Speak: true
      });
      return interaction.reply({ embeds: [successEmbed('Kepemilikan Baru', `👑 Selamat ${member}, Anda sekarang adalah pemilik baru ruangan ini!`)], ephemeral: true });
    }

    if (sub === 'info') {
      const ownerUser = await interaction.client.users.fetch(roomData.ownerId).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`ℹ️ Info Ruangan: ${voiceChannel.name}`)
        .addFields(
          { name: '👑 Pemilik', value: ownerUser ? `${ownerUser.tag} (\`${ownerUser.id}\`)` : 'Tidak diketahui', inline: true },
          { name: '👥 Member Saat Ini', value: `${voiceChannel.members.size}/${voiceChannel.userLimit || 'Tak terbatas'}`, inline: true },
          { name: '📶 Bitrate', value: `${voiceChannel.bitrate / 1000} kbps`, inline: true },
          { name: '⏳ Waiting Room', value: roomData.waitingRoom ? 'Aktif' : 'Non-aktif', inline: true },
          { name: '🛡️ Trusted', value: roomData.trusted.length > 0 ? roomData.trusted.map(id => `<@${id}>`).join(', ') : 'Tidak ada' },
          { name: '🚫 Blocked', value: roomData.blocked.length > 0 ? roomData.blocked.map(id => `<@${id}>`).join(', ') : 'Tidak ada' }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!isOwner && !isAdmin) {
      return interaction.reply({ embeds: [errorEmbed('Akses Ditolak', 'Hanya pemilik ruangan atau Admin yang dapat mengubah setelan voice room.')], ephemeral: true });
    }

    if (sub === 'name') {
      const newName = interaction.options.getString('nama');
      await voiceChannel.setName(newName.substring(0, 32));
      return interaction.reply({ embeds: [successEmbed('Nama Diubah', `🏷️ Nama ruangan diubah menjadi: **${newName.substring(0, 32)}**`)], ephemeral: true });
    }

    if (sub === 'limit') {
      const val = interaction.options.getInteger('jumlah');
      await voiceChannel.setUserLimit(val);
      return interaction.reply({ embeds: [successEmbed('Batas Diatur', `👥 Batas member diatur menjadi: **${val === 0 ? 'Tanpa Batas' : val}**`)], ephemeral: true });
    }

    if (sub === 'lock') {
      await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
      return interaction.reply({ embeds: [successEmbed('Ruangan Dikunci', '🔒 Ruangan sekarang terkunci untuk umum.')], ephemeral: true });
    }

    if (sub === 'unlock') {
      await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: true });
      return interaction.reply({ embeds: [successEmbed('Ruangan Dibuka', '🔓 Ruangan sekarang terbuka untuk semua member.')], ephemeral: true });
    }

    if (sub === 'kick') {
      const user = interaction.options.getUser('target');
      const target = await guild.members.fetch(user.id).catch(() => null);
      if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Member tidak ditemukan.')], ephemeral: true });
      if (target.voice.channelId === voiceChannel.id) {
        await target.voice.disconnect();
        return interaction.reply({ embeds: [successEmbed('Member Dikeluarkan', `📞 ${target} telah dikeluarkan dari voice room.`)], ephemeral: true });
      }
      return interaction.reply({ embeds: [errorEmbed('Tidak di Room', 'Member tersebut tidak sedang berada di dalam room ini.')], ephemeral: true });
    }

    if (sub === 'trust') {
      const user = interaction.options.getUser('target');
      await voiceChannel.permissionOverwrites.edit(user.id, { Connect: true, Speak: true });
      db.updateGuild(guild.id, data => {
        if (!data.temporaryVoiceRooms[voiceChannel.id].trusted.includes(user.id)) {
          data.temporaryVoiceRooms[voiceChannel.id].trusted.push(user.id);
        }
      });
      return interaction.reply({ embeds: [successEmbed('Trusted Member', `👤 <@${user.id}> sekarang menjadi **Trusted Member** di room ini.`)], ephemeral: true });
    }

    if (sub === 'untrust') {
      const user = interaction.options.getUser('target');
      await voiceChannel.permissionOverwrites.delete(user.id);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].trusted = data.temporaryVoiceRooms[voiceChannel.id].trusted.filter(id => id !== user.id);
      });
      return interaction.reply({ embeds: [successEmbed('Status Dicabut', `👤 Status trusted <@${user.id}> telah dicabut.`)], ephemeral: true });
    }

    if (sub === 'block') {
      const user = interaction.options.getUser('target');
      await voiceChannel.permissionOverwrites.edit(user.id, { Connect: false, ViewChannel: false });
      const targetMember = guild.members.cache.get(user.id);
      if (targetMember && targetMember.voice.channelId === voiceChannel.id) {
        await targetMember.voice.disconnect();
      }
      db.updateGuild(guild.id, data => {
        if (!data.temporaryVoiceRooms[voiceChannel.id].blocked.includes(user.id)) {
          data.temporaryVoiceRooms[voiceChannel.id].blocked.push(user.id);
        }
      });
      return interaction.reply({ embeds: [successEmbed('Member Diblokir', `🚫 <@${user.id}> telah diblokir dari room ini.`)], ephemeral: true });
    }

    if (sub === 'unblock') {
      const user = interaction.options.getUser('target');
      await voiceChannel.permissionOverwrites.delete(user.id);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].blocked = data.temporaryVoiceRooms[voiceChannel.id].blocked.filter(id => id !== user.id);
      });
      return interaction.reply({ embeds: [successEmbed('Blokir Dibuka', `🔓 Blokir terhadap <@${user.id}> telah dibuka.`)], ephemeral: true });
    }

    if (sub === 'bitrate') {
      const val = interaction.options.getInteger('kbps');
      try {
        await voiceChannel.setBitrate(val * 1000);
        return interaction.reply({ embeds: [successEmbed('Bitrate Diatur', `📶 Bitrate diatur menjadi: **${val} kbps**`)], ephemeral: true });
      } catch {
        return interaction.reply({ embeds: [errorEmbed('Gagal', 'Bitrate terlalu tinggi untuk tier server saat ini.')], ephemeral: true });
      }
    }

    if (sub === 'reset') {
      await voiceChannel.edit({
        name: `🔊 ${member.displayName}'s Room`,
        userLimit: 0,
        bitrate: 64000
      });
      await voiceChannel.permissionOverwrites.set([
        { id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }
      ]);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].trusted = [];
        data.temporaryVoiceRooms[voiceChannel.id].blocked = [];
        data.temporaryVoiceRooms[voiceChannel.id].waitingRoom = false;
      });
      return interaction.reply({ embeds: [successEmbed('Pengaturan Direset', '⚙️ Seluruh pengaturan ruangan telah direset ke default.')], ephemeral: true });
    }

    if (sub === 'invite') {
      const invite = await voiceChannel.createInvite({ maxAge: 3600, maxUses: 5 });
      return interaction.reply({ embeds: [successEmbed('Undangan Dibuat', `📞 Link undangan ke room ini (berlaku 1 jam):\n${invite.url}`)], ephemeral: true });
    }

    if (sub === 'waiting') {
      const currentWait = roomData.waitingRoom;
      const newWait = !currentWait;
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].waitingRoom = newWait;
      });
      if (newWait) {
        await voiceChannel.permissionOverwrites.edit(guild.id, { Speak: false });
      } else {
        await voiceChannel.permissionOverwrites.edit(guild.id, { Speak: null });
      }
      return interaction.reply({ embeds: [successEmbed('Waiting Room', newWait ? '⏳ **Waiting Room Aktif:** Member baru tidak dapat berbicara.' : '⏳ Waiting Room dinonaktifkan.')], ephemeral: true });
    }
  }
};
