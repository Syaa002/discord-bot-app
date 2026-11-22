const { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { successEmbed, errorEmbed, infoEmbed, applyBanner } = require('../../utils/embeds');

const VALID_KEYS = [
  'default',
  'help',
  'voice',
  'ticket',
  'giveaway',
  'reactionrole',
  'welcome',
  'feeds',
  'serverinfo',
  'community',
  'mod'
];

const KEY_LABELS = {
  default: '🌐 Banner Default Server (Global)',
  help: '📖 Menu Help & Bantuan',
  voice: '🔊 Temporary Voice Rooms',
  ticket: '🎫 Tiket Bantuan & Dukungan',
  giveaway: '🎉 Giveaway Interaktif',
  reactionrole: '🎭 Reaction Role / Button Role',
  welcome: '🌸 Welcome / Sambutan Member',
  feeds: '📡 Notifikasi YouTube & TikTok',
  serverinfo: '🏰 Info Server, User & Saluran',
  community: '🧰 Komunitas (Poll, Quote, Suggest)',
  mod: '🛡️ Moderasi, Report & Audit Log'
};

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

module.exports = {
  name: 'banner',
  description: 'Atur banner embed Discord global atau per-fitur',
  category: 'admin',
  usage: '!banner set <url> [fitur] | !banner reset [fitur] | !banner list',
  aliases: ['setbanner', 'resetbanner', 'banners'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Kelola banner embed Discord server')
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Pasang banner untuk fitur atau default server')
        .addStringOption(opt => opt.setName('url').setDescription('URL gambar/GIF banner (http/https)').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('feature')
            .setDescription('Fitur target (default: Global Server)')
            .setRequired(false)
            .addChoices(
              { name: '🌐 Global Default Server', value: 'default' },
              { name: '📖 Menu Help', value: 'help' },
              { name: '🔊 Temporary Voice', value: 'voice' },
              { name: '🎫 Sistem Tiket', value: 'ticket' },
              { name: '🎉 Giveaway Interaktif', value: 'giveaway' },
              { name: '🎭 Reaction Role', value: 'reactionrole' },
              { name: '🌸 Welcome Member', value: 'welcome' },
              { name: '📡 Feeds YouTube & TikTok', value: 'feeds' },
              { name: '🏰 Info Server & User', value: 'serverinfo' },
              { name: '🧰 Komunitas (Poll, Suggest)', value: 'community' },
              { name: '🛡️ Moderasi & Log', value: 'mod' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Hapus banner fitur atau banner default')
        .addStringOption(opt =>
          opt
            .setName('feature')
            .setDescription('Fitur yang ingin di-reset (default: Global Server)')
            .setRequired(false)
            .addChoices(
              { name: '🌐 Global Default Server', value: 'default' },
              { name: '📖 Menu Help', value: 'help' },
              { name: '🔊 Temporary Voice', value: 'voice' },
              { name: '🎫 Sistem Tiket', value: 'ticket' },
              { name: '🎉 Giveaway Interaktif', value: 'giveaway' },
              { name: '🎭 Reaction Role', value: 'reactionrole' },
              { name: '🌸 Welcome Member', value: 'welcome' },
              { name: '📡 Feeds YouTube & TikTok', value: 'feeds' },
              { name: '🏰 Info Server & User', value: 'serverinfo' },
              { name: '🧰 Komunitas', value: 'community' },
              { name: '🛡️ Moderasi & Log', value: 'mod' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Lihat daftar banner aktif saat ini')
    ),

  async execute(message, args) {
    const guildId = message.guild.id;
    const action = (args[0] || 'list').toLowerCase();

    // 1. LIST BANNER
    if (action === 'list') {
      const guildData = db.getGuild(guildId);
      const banners = guildData.banners || {};

      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`🖼️ Daftar Banner Server: ${message.guild.name}`)
        .setDescription(
          'Daftar URL banner yang aktif untuk server ini. Format didukung: `.png`, `.jpg`, `.webp`, `.gif`.\n' +
          'Jika banner khusus kosong, bot akan otomatis menggunakan **Banner Default Server**.'
        )
        .setTimestamp();

      for (const key of VALID_KEYS) {
        const url = banners[key];
        const status = url ? `[Lihat Gambar](${url})` : key === 'default' ? '*Belum diatur*' : '*Mengikuti Default*';
        embed.addFields({ name: KEY_LABELS[key] || key, value: status, inline: true });
      }

      applyBanner(embed, guildId, 'default');
      return message.reply({ embeds: [embed] });
    }

    // 2. SET BANNER
    if (action === 'set') {
      const url = args[1];
      const targetKey = (args[2] || 'default').toLowerCase();

      if (!url || !isValidUrl(url)) {
        return message.reply({
          embeds: [errorEmbed('URL Tidak Valid', 'Mohon sertakan URL gambar yang valid (dimulai dengan `http://` atau `https://`).\nContoh: `!banner set https://i.imgur.com/example.png`')]
        });
      }

      if (!VALID_KEYS.includes(targetKey)) {
        return message.reply({
          embeds: [errorEmbed('Kategori Tidak Valid', `Pilihan fitur:\n\`${VALID_KEYS.join(', ')}\``)]
        });
      }

      db.updateGuild(guildId, data => {
        if (!data.banners) data.banners = {};
        data.banners[targetKey] = url;
      });

      const embed = new EmbedBuilder()
        .setColor(0x00F5D4)
        .setTitle('✅ Banner Berhasil Diperbarui')
        .setDescription(`Banner untuk **${KEY_LABELS[targetKey] || targetKey}** telah berhasil disimpan!`)
        .setImage(url)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // 3. RESET BANNER
    if (action === 'reset') {
      const targetKey = (args[1] || 'default').toLowerCase();

      if (!VALID_KEYS.includes(targetKey)) {
        return message.reply({
          embeds: [errorEmbed('Kategori Tidak Valid', `Pilihan fitur:\n\`${VALID_KEYS.join(', ')}\``)]
        });
      }

      db.updateGuild(guildId, data => {
        if (!data.banners) data.banners = {};
        data.banners[targetKey] = null;
      });

      return message.reply({
        embeds: [successEmbed('Banner Direset', `Banner untuk **${KEY_LABELS[targetKey] || targetKey}** telah dihapus.`)]
      });
    }

    // Help jika format salah
    return message.reply({
      embeds: [infoEmbed('Panduan Perintah Banner', `Gunakan format:\n• \`!banner list\`\n• \`!banner set <url> [fitur]\`\n• \`!banner reset [fitur]\`\n\nFitur tersedia: \`${VALID_KEYS.join(', ')}\``)]
    });
  },

  async executeSlash(interaction) {
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      const guildData = db.getGuild(guildId);
      const banners = guildData.banners || {};

      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`🖼️ Daftar Banner Server: ${interaction.guild.name}`)
        .setDescription(
          'Daftar URL banner yang aktif untuk server ini. Format didukung: `.png`, `.jpg`, `.webp`, `.gif`.\n' +
          'Jika banner khusus kosong, bot akan otomatis menggunakan **Banner Default Server**.'
        )
        .setTimestamp();

      for (const key of VALID_KEYS) {
        const url = banners[key];
        const status = url ? `[Lihat Gambar](${url})` : key === 'default' ? '*Belum diatur*' : '*Mengikuti Default*';
        embed.addFields({ name: KEY_LABELS[key] || key, value: status, inline: true });
      }

      applyBanner(embed, guildId, 'default');
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'set') {
      const url = interaction.options.getString('url');
      const targetKey = interaction.options.getString('feature') || 'default';

      if (!isValidUrl(url)) {
        return interaction.reply({
          embeds: [errorEmbed('URL Tidak Valid', 'URL gambar harus diawali `http://` atau `https://`.')],
          ephemeral: true
        });
      }

      db.updateGuild(guildId, data => {
        if (!data.banners) data.banners = {};
        data.banners[targetKey] = url;
      });

      const embed = new EmbedBuilder()
        .setColor(0x00F5D4)
        .setTitle('✅ Banner Berhasil Diperbarui')
        .setDescription(`Banner untuk **${KEY_LABELS[targetKey] || targetKey}** telah berhasil disimpan!`)
        .setImage(url)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'reset') {
      const targetKey = interaction.options.getString('feature') || 'default';

      db.updateGuild(guildId, data => {
        if (!data.banners) data.banners = {};
        data.banners[targetKey] = null;
      });

      return interaction.reply({
        embeds: [successEmbed('Banner Direset', `Banner untuk **${KEY_LABELS[targetKey] || targetKey}** telah dihapus.`)]
      });
    }
  }
};
