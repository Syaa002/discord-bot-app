const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../database/jsonDb');
const { sendLog } = require('./logger');
const { COLORS } = require('../utils/embeds');

const TRANSCRIPTS_DIR = path.join(__dirname, '..', '..', 'data', 'transcripts');
if (!fs.existsSync(TRANSCRIPTS_DIR)) fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });

const TICKET_TYPES = [
  { label: 'Bantuan Umum', value: 'ticket_general', description: 'Pertanyaan atau bantuan seputar server', emoji: '❓' },
  { label: 'Kendala Teknis', value: 'ticket_technical', description: 'Masalah teknis, bug, atau error bot', emoji: '🛠️' },
  { label: 'Laporan Pelanggaran', value: 'ticket_report', description: 'Laporkan member yang melanggar aturan', emoji: '🚨' },
  { label: 'Kemitraan & Partner', value: 'ticket_partner', description: 'Pengajuan kerjasama dan partnership', emoji: '🤝' },
  { label: 'Donasi & Billing', value: 'ticket_billing', description: 'Konfirmasi donasi atau urusan transaksi', emoji: '💎' }
];

function createTicketPanelMessage() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('🎫 Pusat Bantuan & Dukungan Tiket')
    .setDescription(
      'Butuh bantuan staf atau ingin melaporkan sesuatu?\n' +
      'Silakan pilih kategori tiket yang sesuai pada menu dropdown di bawah ini.\n\n' +
      '⏰ *Tim kami akan merespons tiket Anda secepat mungkin.*'
    )
    .setFooter({ text: 'Satu pengguna hanya disarankan membuka satu tiket per masalah.' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select_category')
    .setPlaceholder('Pilih jenis kategori tiket...')
    .addOptions(TICKET_TYPES);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

async function sendTicketPanel(channel) {
  const payload = createTicketPanelMessage();
  const msg = await channel.send(payload);

  db.updateGuild(channel.guild.id, data => {
    data.ticketPanelMessageId = msg.id;
    data.ticketPanelChannelId = channel.id;
  });

  return msg;
}

async function handleTicketInteraction(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;

  // 1. Pemilihan Kategori dari Select Menu
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_category') {
    const selectedType = interaction.values[0];
    const categoryInfo = TICKET_TYPES.find(t => t.value === selectedType) || TICKET_TYPES[0];

    const guildData = db.getGuild(guild.id);
    const parentCategory = guildData.ticketCategory;
    const supportRoleId = guildData.ticketSupportRole;

    const channelName = `tiket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const permissionOverwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      },
      {
        id: guild.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ];

    if (supportRoleId && guild.roles.cache.has(supportRoleId)) {
      permissionOverwrites.push({
        id: supportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: parentCategory || null,
        topic: `Tiket dibuat oleh ${member.user.tag} (${member.id}) | Kategori: ${categoryInfo.label}`,
        permissionOverwrites
      });

      const welcomeEmbed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`🎫 Tiket: ${categoryInfo.label}`)
        .setDescription(
          `Halo ${member}, terima kasih telah menghubungi kami!\n` +
          `Jelaskan detail kendala Anda secara lengkap di channel ini. ${supportRoleId ? `<@&${supportRoleId}>` : 'Staf kami'} akan segera membantu Anda.\n\n` +
          `Klik tombol **Tutup Tiket** di bawah jika masalah sudah selesai.`
        )
        .addFields({ name: 'Kategori', value: `${categoryInfo.emoji} ${categoryInfo.label}`, inline: true })
        .setTimestamp();

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close_button')
          .setLabel('Tutup Tiket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ content: `${member}`, embeds: [welcomeEmbed], components: [closeRow] });

      await interaction.reply({
        content: `✅ Tiket Anda berhasil dibuat: ${ticketChannel}`,
        ephemeral: true
      });

      await sendLog(guild, {
        category: 'Tiket',
        title: 'Tiket Baru Dibuat',
        description: `Pengguna ${member} membuka tiket ${ticketChannel} (Kategori: ${categoryInfo.label}).`,
        color: COLORS.SUCCESS,
        author: member.user
      });
    } catch (err) {
      console.error('[Tickets] Gagal membuat ticket channel:', err);
      return interaction.reply({ content: '❌ Terjadi kesalahan saat membuat tiket.', ephemeral: true });
    }
  }

  // 2. Tombol Tutup Tiket
  if (interaction.isButton() && interaction.customId === 'ticket_close_button') {
    const channel = interaction.channel;
    await interaction.reply({ content: '🔒 Menutup tiket dan membuat transkrip dalam 5 detik...' });

    try {
      // Ekstrak info pembuat dan kategori dari topic
      let creatorTag = 'Member';
      let categoryName = 'Bantuan Umum';
      if (channel.topic) {
        const topicMatch = channel.topic.match(/oleh\s+([^\(]+)\s*\(([^)]+)\)\s*\|\s*Kategori:\s*(.+)/i);
        if (topicMatch) {
          creatorTag = topicMatch[1].trim();
          categoryName = topicMatch[3].trim();
        }
      }

      // Simpan Transkrip
      const messages = await channel.messages.fetch({ limit: 100 });
      const transcriptLines = messages.reverse().map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.cleanContent}`);
      const transcriptText = transcriptLines.join('\n');

      const filename = `${channel.name}.txt`;
      const transcriptPath = path.join(TRANSCRIPTS_DIR, filename);
      fs.writeFileSync(transcriptPath, transcriptText, 'utf-8');

      // Simpan ke riwayat database
      db.updateGuild(guild.id, data => {
        if (!data.closedTickets) data.closedTickets = [];
        data.closedTickets.unshift({
          id: channel.name,
          channelName: channel.name,
          creatorTag,
          category: categoryName,
          closedBy: interaction.user.tag,
          closedAt: Date.now(),
          filename
        });
        if (data.closedTickets.length > 100) data.closedTickets.pop();
      });

      await sendLog(guild, {
        category: 'Tiket',
        title: 'Tiket Ditutup',
        description: `Channel tiket \`${channel.name}\` ditutup oleh ${interaction.user}. Transkrip telah disimpan.`,
        color: COLORS.ERROR,
        author: interaction.user
      });

      setTimeout(async () => {
        await channel.delete('Tiket ditutup').catch(() => {});
      }, 5000);
    } catch (err) {
      console.error('[Tickets] Gagal menutup tiket:', err);
    }
  }
}

module.exports = {
  TICKET_TYPES,
  createTicketPanelMessage,
  sendTicketPanel,
  handleTicketInteraction,
  TRANSCRIPTS_DIR
};
