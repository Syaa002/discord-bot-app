const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Menampilkan menu bantuan dan daftar seluruh perintah bot',
  category: 'info',
  usage: '!help',
  aliases: ['h', 'menu'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tampilkan menu bantuan bot'),

  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle('📖 Panduan & Bantuan Discord Bot')
      .setDescription(
        'Selamat datang di pusat bantuan bot!\n' +
        'Bot ini mendukung perintah dengan prefix **`!`** maupun **Slash Command (`/`)**.\n\n' +
        'Silakan pilih kategori di menu dropdown di bawah untuk melihat rincian perintah:'
      )
      .addFields(
        { name: '🛡️ Moderasi & Keamanan', value: 'Ban, Kick, Timeout, Warn, Delete/Purge, Lockdown, dll.' },
        { name: 'ℹ️ Informasi & Server', value: 'Serverinfo, Userinfo, Snipe, Avatar, Ping, Uptime, dll.' },
        { name: '🧰 Komunitas & Interaksi', value: 'Poll, Quote, Suggest, Emoji, GIF, Fact, Thread.' },
        { name: '🎛️ Panel & Sistem', value: 'Temporary Voice (18 Tombol), Tiket, Giveaway, Reaction Role.' },
        { name: '⚙️ Developer & Admin', value: 'Config, Sync, Backup, Reload, Webhook, DB Ping, dll.' }
      )
      .setFooter({ text: 'Gunakan !help <perintah> atau pilih kategori di bawah.' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_select_category')
      .setPlaceholder('Pilih kategori perintah...')
      .addOptions([
        { label: 'Moderasi & Keamanan', value: 'help_mod', emoji: '🛡️' },
        { label: 'Informasi & Server', value: 'help_info', emoji: 'ℹ️' },
        { label: 'Komunitas & Interaksi', value: 'help_community', emoji: '🧰' },
        { label: 'Panel & Sistem Interaktif', value: 'help_panels', emoji: '🎛️' },
        { label: 'Developer & Administrasi', value: 'help_admin', emoji: '⚙️' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    return message.reply({ embeds: [embed], components: [row] });
  },

  async executeSlash(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle('📖 Panduan & Bantuan Discord Bot')
      .setDescription(
        'Selamat datang di pusat bantuan bot!\n' +
        'Bot ini mendukung perintah dengan prefix **`!`** maupun **Slash Command (`/`)**.\n\n' +
        'Silakan pilih kategori di menu dropdown di bawah untuk melihat rincian perintah:'
      )
      .addFields(
        { name: '🛡️ Moderasi & Keamanan', value: 'Ban, Kick, Timeout, Warn, Delete/Purge, Lockdown, dll.' },
        { name: 'ℹ️ Informasi & Server', value: 'Serverinfo, Userinfo, Snipe, Avatar, Ping, Uptime, dll.' },
        { name: '🧰 Komunitas & Interaksi', value: 'Poll, Quote, Suggest, Emoji, GIF, Fact, Thread.' },
        { name: '🎛️ Panel & Sistem', value: 'Temporary Voice (18 Tombol), Tiket, Giveaway, Reaction Role.' },
        { name: '⚙️ Developer & Admin', value: 'Config, Sync, Backup, Reload, Webhook, DB Ping, dll.' }
      );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_select_category')
      .setPlaceholder('Pilih kategori perintah...')
      .addOptions([
        { label: 'Moderasi & Keamanan', value: 'help_mod', emoji: '🛡️' },
        { label: 'Informasi & Server', value: 'help_info', emoji: 'ℹ️' },
        { label: 'Komunitas & Interaksi', value: 'help_community', emoji: '🧰' },
        { label: 'Panel & Sistem Interaktif', value: 'help_panels', emoji: '🎛️' },
        { label: 'Developer & Administrasi', value: 'help_admin', emoji: '⚙️' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    return interaction.reply({ embeds: [embed], components: [row] });
  }
};
