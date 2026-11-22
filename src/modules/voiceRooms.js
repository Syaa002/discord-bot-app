const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder
} = require('discord.js');
const db = require('../database/jsonDb');
const { COLORS, applyBanner } = require('../utils/embeds');

// Helper untuk membuat panel kontrol suara minimalis (11 tombol ikon)
function createVoiceControlRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vc_limit').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
    new ButtonBuilder().setCustomId('vc_chat').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
    new ButtonBuilder().setCustomId('vc_name').setStyle(ButtonStyle.Secondary).setEmoji('🏷️'),
    new ButtonBuilder().setCustomId('vc_privacy').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('vc_bitrate').setStyle(ButtonStyle.Secondary).setEmoji('📶')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vc_kick').setStyle(ButtonStyle.Secondary).setEmoji('📞'),
    new ButtonBuilder().setCustomId('vc_trust').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
    new ButtonBuilder().setCustomId('vc_untrust').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
    new ButtonBuilder().setCustomId('vc_block').setStyle(ButtonStyle.Secondary).setEmoji('🚫'),
    new ButtonBuilder().setCustomId('vc_unblock').setStyle(ButtonStyle.Secondary).setEmoji('🔓')
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vc_reset').setStyle(ButtonStyle.Secondary).setEmoji('⚙️')
  );

  return [row1, row2, row3];
}

// Helper teks embed TempVoice Interface minimalis
function buildInterfaceEmbed(guildId) {
  const embed = new EmbedBuilder()
    .setColor(0xEF233C)
    .setTitle('TempVoice Interface')
    .setDescription(
      'This interface can be used to manage temporary voice channels.\n' +
      'More options are available with /voice commands.\n\n' +
      '`👥 LIMIT` `💬 CHAT` `🏷️ NAME` `🔒 PRIVACY` `📶 BITRATE`\n' +
      '`📞 KICK` `👤 TRUST` `👤 UNTRUST` `🚫 BLOCK` `🔓 UNBLOCK`\n' +
      '`⚙️ RESET`\n\n' +
      'Press the buttons below to use the interface'
    );

  applyBanner(embed, guildId, 'voice');
  return embed;
}

// Mengirimkan Panel Interface Permanen ke Saluran Teks (seperti #interface)
async function sendInterfacePanel(textChannel) {
  const embed = buildInterfaceEmbed(textChannel.guild.id);
  const rows = createVoiceControlRows();

  let msg;
  const guildData = db.getGuild(textChannel.guild.id);
  const existingMsgId = guildData.voiceInterfaceMessageId;
  const existingChannelId = guildData.voiceInterfaceChannel;

  // Coba perbarui pesan yang sudah ada jika berada di channel yang sama
  if (existingMsgId && existingChannelId === textChannel.id) {
    try {
      const oldMsg = await textChannel.messages.fetch(existingMsgId).catch(() => null);
      if (oldMsg) {
        msg = await oldMsg.edit({ embeds: [embed], components: rows });
      }
    } catch (_) {}
  }

  // Jika belum ada atau pesan lama terhapus, kirim pesan baru
  if (!msg) {
    msg = await textChannel.send({ embeds: [embed], components: rows });
  }

  db.updateGuild(textChannel.guild.id, data => {
    data.voiceInterfaceChannel = textChannel.id;
    data.voiceInterfaceMessageId = msg.id;
  });

  return msg;
}

// Sinkronisasi/perbarui otomatis panel interface di semua server saat bot ready
async function refreshAllInterfacePanels(client) {
  for (const [guildId, guild] of client.guilds.cache) {
    const guildData = db.getGuild(guildId);
    if (guildData && guildData.voiceInterfaceChannel) {
      try {
        const channel = await guild.channels.fetch(guildData.voiceInterfaceChannel).catch(() => null);
        if (channel && channel.isTextBased()) {
          const embed = buildInterfaceEmbed(guildId);
          const rows = createVoiceControlRows();

          let oldMsg = null;
          if (guildData.voiceInterfaceMessageId) {
            oldMsg = await channel.messages.fetch(guildData.voiceInterfaceMessageId).catch(() => null);
          }

          if (oldMsg) {
            await oldMsg.edit({ embeds: [embed], components: rows });
            console.log(`[VoiceRooms] Berhasil memperbarui panel interface ke minimalis di #${channel.name} (${guild.name})`);
          } else {
            const newMsg = await channel.send({ embeds: [embed], components: rows });
            db.updateGuild(guildId, data => {
              data.voiceInterfaceMessageId = newMsg.id;
            });
            console.log(`[VoiceRooms] Berhasil mengirimkan panel interface minimalis baru ke #${channel.name} (${guild.name})`);
          }
        }
      } catch (err) {
        console.error(`[VoiceRooms] Gagal auto-update/send panel interface di guild ${guildId}:`, err.message);
      }
    }
  }
}

async function handleVoiceState(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;

  const guildData = db.getGuild(guild.id);
  const joinToCreateId = guildData.joinToCreateChannel;

  // 1. User Join ke "Join to Create" channel
  if (newState.channelId && newState.channelId === joinToCreateId) {
    const member = newState.member;
    if (!member) return;

    try {
      const parentCategory = newState.channel.parentId;

      // Buat voice channel sementara
      const voiceChannel = await guild.channels.create({
        name: `🔊 ${member.displayName}'s Room`,
        type: ChannelType.GuildVoice,
        parent: parentCategory || null,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ]
          }
        ]
      });

      // Pindahkan member ke channel baru
      await member.voice.setChannel(voiceChannel);

      // Simpan data room ke DB
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id] = {
          ownerId: member.id,
          trusted: [],
          blocked: [],
          waitingRoom: false,
          createdAt: Date.now()
        };
      });

      // Kirim panel kontrol interaktif ke dalam text chat voice room itu sendiri (opsional)
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`🎛️ Panel Kontrol Voice: ${voiceChannel.name}`)
        .setDescription(
          `Selamat datang ${member}! Gunakan tombol di bawah ini atau buka channel <#${guildData.voiceInterfaceChannel || voiceChannel.id}> untuk mengatur ruangan Anda.\n\n` +
          `👑 **Pemilik**: ${member}\n` +
          `🔒 **Privacy**: Terbuka\n` +
          `👥 **Batas**: Bebas`
        )
        .setFooter({ text: 'Hanya pemilik yang dapat mengontrol channel ini.' });

      applyBanner(embed, guild.id, 'voice');

      await voiceChannel.send({ embeds: [embed], components: createVoiceControlRows() }).catch(() => {});
    } catch (err) {
      console.error('[VoiceRooms] Gagal membuat temporary voice channel:', err);
    }
  }

  // 2. User Keluar dari channel (Auto-delete jika kosong)
  if (oldState.channelId) {
    const oldChannel = oldState.channel;
    if (oldChannel && guildData.temporaryVoiceRooms[oldChannel.id]) {
      // Jika member di dalam room sudah 0
      if (oldChannel.members.size === 0) {
        try {
          await oldChannel.delete('Temporary Voice Room kosong');
          db.updateGuild(guild.id, data => {
            delete data.temporaryVoiceRooms[oldChannel.id];
          });
        } catch (err) {
          console.error('[VoiceRooms] Gagal menghapus temporary channel:', err);
        }
      }
    }
  }
}

async function handleVoiceInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isUserSelectMenu()) return;
  const customId = interaction.customId;
  if (!customId.startsWith('vc_')) return;

  const guild = interaction.guild;
  const member = interaction.member;
  const guildData = db.getGuild(guild.id);

  // Resolusi Target Voice Channel:
  // Bisa diklik dari dalam voice room itu sendiri, ATAU dari channel #interface!
  let voiceChannel = interaction.channel;
  let roomData = guildData.temporaryVoiceRooms[interaction.channel.id];

  if (!roomData) {
    const userVoiceId = member.voice.channelId;
    if (!userVoiceId || !guildData.temporaryVoiceRooms[userVoiceId]) {
      return interaction.reply({
        content: '❌ **Anda tidak sedang berada di dalam temporary voice room!**\nSilakan bergabung ke saluran temporary voice room Anda terlebih dahulu sebelum menggunakan tombol kontrol ini.',
        ephemeral: true
      });
    }

    voiceChannel = guild.channels.cache.get(userVoiceId);
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Saluran temporary voice tidak ditemukan.', ephemeral: true });
    }
    roomData = guildData.temporaryVoiceRooms[userVoiceId];
  }

  const isOwner = roomData.ownerId === member.id;
  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageChannels);

  // ------------------------------------------------------------------
  // TOMBOL DELETE: HANYA OWNER & ADMIN YANG BISA MENGGUNAKAN
  // ------------------------------------------------------------------
  if (customId === 'vc_delete') {
    if (!isOwner && !isAdmin) {
      return interaction.reply({
        content: '❌ **Akses Ditolak!** Hanya pemilik ruangan ini atau Administrator yang diizinkan menggunakan tombol Delete.',
        ephemeral: true
      });
    }

    await interaction.reply({ content: '🗑️ Menghapus ruangan...', ephemeral: true });
    try {
      db.updateGuild(guild.id, data => {
        delete data.temporaryVoiceRooms[voiceChannel.id];
      });
      await voiceChannel.delete('Dihapus oleh pemilik room');
    } catch (err) {
      console.error('[VoiceRooms] Gagal delete channel via button:', err);
    }
    return;
  }

  // ------------------------------------------------------------------
  // TOMBOL CLAIM: AMBIL ALIH KEPEMILIKAN JIKA OWNER ASLI TIDAK ADA
  // ------------------------------------------------------------------
  if (customId === 'vc_claim') {
    const currentOwnerInRoom = voiceChannel.members.has(roomData.ownerId);
    if (currentOwnerInRoom && !isOwner) {
      return interaction.reply({
        content: '❌ Pemilik ruangan masih berada di dalam channel ini!',
        ephemeral: true
      });
    }

    if (isOwner) {
      return interaction.reply({ content: 'ℹ️ Anda sudah menjadi pemilik ruangan ini.', ephemeral: true });
    }

    db.updateGuild(guild.id, data => {
      data.temporaryVoiceRooms[voiceChannel.id].ownerId = member.id;
    });

    await voiceChannel.permissionOverwrites.edit(member.id, {
      ManageChannels: true,
      MoveMembers: true,
      Connect: true,
      Speak: true
    });

    return interaction.reply({
      content: `👑 Selamat ${member}, Anda sekarang adalah pemilik baru ruangan ini!`,
      ephemeral: true
    });
  }

  // Untuk tombol-tombol lain, pastikan yang menekan adalah owner atau admin
  if (!isOwner && !isAdmin && customId !== 'vc_info') {
    return interaction.reply({
      content: '❌ Anda bukan pemilik ruangan ini.',
      ephemeral: true
    });
  }

  // ------------------------------------------------------------------
  // INFO
  // ------------------------------------------------------------------
  if (customId === 'vc_info') {
    const ownerUser = await interaction.client.users.fetch(roomData.ownerId).catch(() => null);
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`ℹ️ Informasi Ruangan: ${voiceChannel.name}`)
      .addFields(
        { name: '👑 Pemilik', value: ownerUser ? `${ownerUser.tag} (\`${ownerUser.id}\`)` : 'Tidak diketahui', inline: true },
        { name: '👥 Member Saat Ini', value: `${voiceChannel.members.size}/${voiceChannel.userLimit || 'Tak terbatas'}`, inline: true },
        { name: '📶 Bitrate', value: `${voiceChannel.bitrate / 1000} kbps`, inline: true },
        { name: '⏳ Waiting Room', value: roomData.waitingRoom ? 'Aktif' : 'Non-aktif', inline: true },
        { name: '🛡️ Trusted Members', value: roomData.trusted.length > 0 ? roomData.trusted.map(id => `<@${id}>`).join(', ') : 'Tidak ada' },
        { name: '🚫 Blocked Members', value: roomData.blocked.length > 0 ? roomData.blocked.map(id => `<@${id}>`).join(', ') : 'Tidak ada' }
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ------------------------------------------------------------------
  // PRIVACY: TOGGLE LOCK / UNLOCK
  // ------------------------------------------------------------------
  if (customId === 'vc_privacy') {
    const isLocked = !voiceChannel.permissionsFor(guild.id).has(PermissionFlagsBits.Connect);
    const newAllowConnect = isLocked;

    await voiceChannel.permissionOverwrites.edit(guild.id, {
      Connect: newAllowConnect
    });

    return interaction.reply({
      content: newAllowConnect ? '🔓 Ruangan sekarang **Terbuka** untuk semua member.' : '🔒 Ruangan sekarang **Terkunci**.',
      ephemeral: true
    });
  }

  // ------------------------------------------------------------------
  // CHAT: TOGGLE TEXT CHAT ACCESS
  // ------------------------------------------------------------------
  if (customId === 'vc_chat') {
    const canSend = voiceChannel.permissionsFor(guild.id).has(PermissionFlagsBits.SendMessages);
    await voiceChannel.permissionOverwrites.edit(guild.id, {
      SendMessages: !canSend
    });
    return interaction.reply({
      content: !canSend ? '💬 Chat teks ruangan telah **Dibuka**.' : '💬 Chat teks ruangan telah **Dikunci**.',
      ephemeral: true
    });
  }

  // ------------------------------------------------------------------
  // MODAL: NAME
  // ------------------------------------------------------------------
  if (customId === 'vc_name') {
    const modal = new ModalBuilder()
      .setCustomId('vc_modal_name')
      .setTitle('Ganti Nama Ruangan');
    const input = new TextInputBuilder()
      .setCustomId('name_input')
      .setLabel('Nama Baru Ruangan')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(voiceChannel.name)
      .setMaxLength(32)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ------------------------------------------------------------------
  // MODAL: LIMIT
  // ------------------------------------------------------------------
  if (customId === 'vc_limit') {
    const modal = new ModalBuilder()
      .setCustomId('vc_modal_limit')
      .setTitle('Batas Member Ruangan');
    const input = new TextInputBuilder()
      .setCustomId('limit_input')
      .setLabel('Jumlah Maksimal (0 = Tanpa Batas, Maks 99)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Misal: 5')
      .setMaxLength(2)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ------------------------------------------------------------------
  // MODAL: BITRATE
  // ------------------------------------------------------------------
  if (customId === 'vc_bitrate') {
    const modal = new ModalBuilder()
      .setCustomId('vc_modal_bitrate')
      .setTitle('Atur Kualitas Bitrate');
    const input = new TextInputBuilder()
      .setCustomId('bitrate_input')
      .setLabel('Bitrate dalam kbps (8 - 96 kbps, boost s/d 384)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Misal: 64')
      .setMaxLength(3)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ------------------------------------------------------------------
  // RESET
  // ------------------------------------------------------------------
  if (customId === 'vc_reset') {
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
    return interaction.reply({ content: '⚙️ Seluruh pengaturan ruangan telah direset ke default.', ephemeral: true });
  }

  // ------------------------------------------------------------------
  // WAITING ROOM
  // ------------------------------------------------------------------
  if (customId === 'vc_waiting_room') {
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

    return interaction.reply({
      content: newWait ? '⏳ **Waiting Room Aktif:** Member yang masuk tidak dapat langsung berbicara.' : '⏳ Waiting Room dinonaktifkan.',
      ephemeral: true
    });
  }

  // ------------------------------------------------------------------
  // MENU PILIH USER: KICK, TRUST, UNTRUST, BLOCK, UNBLOCK, TRANSFER
  // ------------------------------------------------------------------
  if (['vc_kick', 'vc_trust', 'vc_untrust', 'vc_block', 'vc_unblock', 'vc_transfer'].includes(customId)) {
    const select = new UserSelectMenuBuilder()
      .setCustomId(`vc_userselect_${customId.replace('vc_', '')}`)
      .setPlaceholder('Pilih member target...');
    const row = new ActionRowBuilder().addComponents(select);
    return interaction.reply({ content: 'Silakan pilih member yang ingin ditindak:', components: [row], ephemeral: true });
  }

  // ------------------------------------------------------------------
  // INVITE
  // ------------------------------------------------------------------
  if (customId === 'vc_invite') {
    const invite = await voiceChannel.createInvite({ maxAge: 3600, maxUses: 5 });
    return interaction.reply({ content: `📞 Link undangan ke room ini (berlaku 1 jam): ${invite.url}`, ephemeral: true });
  }
}

// Handler modal & user select voice
async function handleVoiceModalAndSelect(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;
  const guildData = db.getGuild(guild.id);

  // Resolusi target voice channel
  let voiceChannel = interaction.channel;
  let roomData = guildData.temporaryVoiceRooms[interaction.channel.id];

  if (!roomData) {
    const userVoiceId = member.voice.channelId;
    if (userVoiceId && guildData.temporaryVoiceRooms[userVoiceId]) {
      voiceChannel = guild.channels.cache.get(userVoiceId) || interaction.channel;
      roomData = guildData.temporaryVoiceRooms[userVoiceId];
    }
  }

  if (!roomData) {
    return interaction.reply({ content: '❌ Tidak dapat menemukan temporary voice room Anda.', ephemeral: true });
  }

  // 1. Modal Submit
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'vc_modal_name') {
      const newName = interaction.fields.getTextInputValue('name_input');
      await voiceChannel.setName(newName);
      return interaction.reply({ content: `🏷️ Nama ruangan diubah menjadi: **${newName}**`, ephemeral: true });
    }
    if (interaction.customId === 'vc_modal_limit') {
      const limitVal = parseInt(interaction.fields.getTextInputValue('limit_input'), 10) || 0;
      await voiceChannel.setUserLimit(Math.min(99, Math.max(0, limitVal)));
      return interaction.reply({ content: `👥 Batas member diatur menjadi: **${limitVal === 0 ? 'Tanpa Batas' : limitVal}**`, ephemeral: true });
    }
    if (interaction.customId === 'vc_modal_bitrate') {
      const bitrateVal = parseInt(interaction.fields.getTextInputValue('bitrate_input'), 10) || 64;
      const bps = Math.min(384, Math.max(8, bitrateVal)) * 1000;
      try {
        await voiceChannel.setBitrate(bps);
        return interaction.reply({ content: `📶 Bitrate diatur menjadi: **${bitrateVal} kbps**`, ephemeral: true });
      } catch (e) {
        return interaction.reply({ content: `❌ Bitrate terlalu tinggi untuk tier boost server ini.`, ephemeral: true });
      }
    }
  }

  // 2. User Select Menu
  if (interaction.isUserSelectMenu()) {
    const targetId = interaction.values[0];
    const targetMember = await guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) return interaction.reply({ content: 'Member tidak ditemukan.', ephemeral: true });

    if (interaction.customId === 'vc_userselect_kick') {
      if (targetMember.voice.channelId === voiceChannel.id) {
        await targetMember.voice.disconnect();
        return interaction.reply({ content: `📞 ${targetMember} telah dikeluarkan dari voice room.`, ephemeral: true });
      }
      return interaction.reply({ content: 'Member tersebut tidak sedang berada di dalam room ini.', ephemeral: true });
    }

    if (interaction.customId === 'vc_userselect_trust') {
      await voiceChannel.permissionOverwrites.edit(targetId, { Connect: true, Speak: true });
      db.updateGuild(guild.id, data => {
        if (!data.temporaryVoiceRooms[voiceChannel.id].trusted.includes(targetId)) {
          data.temporaryVoiceRooms[voiceChannel.id].trusted.push(targetId);
        }
      });
      return interaction.reply({ content: `👤 ${targetMember} sekarang menjadi **Trusted Member** di room ini.`, ephemeral: true });
    }

    if (interaction.customId === 'vc_userselect_untrust') {
      await voiceChannel.permissionOverwrites.delete(targetId);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].trusted = data.temporaryVoiceRooms[voiceChannel.id].trusted.filter(id => id !== targetId);
      });
      return interaction.reply({ content: `👤 Status trusted ${targetMember} telah dicabut.`, ephemeral: true });
    }

    if (interaction.customId === 'vc_userselect_block') {
      await voiceChannel.permissionOverwrites.edit(targetId, { Connect: false, ViewChannel: false });
      if (targetMember.voice.channelId === voiceChannel.id) {
        await targetMember.voice.disconnect();
      }
      db.updateGuild(guild.id, data => {
        if (!data.temporaryVoiceRooms[voiceChannel.id].blocked.includes(targetId)) {
          data.temporaryVoiceRooms[voiceChannel.id].blocked.push(targetId);
        }
      });
      return interaction.reply({ content: `🚫 ${targetMember} telah diblokir dari room ini.`, ephemeral: true });
    }

    if (interaction.customId === 'vc_userselect_unblock') {
      await voiceChannel.permissionOverwrites.delete(targetId);
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].blocked = data.temporaryVoiceRooms[voiceChannel.id].blocked.filter(id => id !== targetId);
      });
      return interaction.reply({ content: `🔓 Blokir terhadap ${targetMember} telah dibuka.`, ephemeral: true });
    }

    if (interaction.customId === 'vc_userselect_transfer') {
      db.updateGuild(guild.id, data => {
        data.temporaryVoiceRooms[voiceChannel.id].ownerId = targetId;
      });
      await voiceChannel.permissionOverwrites.edit(targetId, {
        ManageChannels: true,
        MoveMembers: true,
        Connect: true,
        Speak: true
      });
      return interaction.reply({ content: `👑 Kepemilikan ruangan telah diserahkan kepada ${targetMember}.`, ephemeral: true });
    }
  }
}

module.exports = {
  createVoiceControlRows,
  sendInterfacePanel,
  refreshAllInterfacePanels,
  handleVoiceState,
  handleVoiceInteraction,
  handleVoiceModalAndSelect
};
