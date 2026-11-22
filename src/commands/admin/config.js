const { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'config',
  description: 'Melihat atau mengatur konfigurasi bot di server',
  category: 'admin',
  usage: '!config <view|modlog|autorole|prefix|youtube> [value]',
  aliases: ['settings'],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Kelola konfigurasi bot di server')
    .addSubcommand(sub => sub.setName('view').setDescription('Lihat konfigurasi saat ini'))
    .addSubcommand(sub =>
      sub.setName('modlog')
        .setDescription('Atur channel untuk log audit & moderasi')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel log').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('autorole')
        .setDescription('Atur role otomatis untuk member baru')
        .addRoleOption(opt => opt.setName('role').setDescription('Role yang diberikan otomatis').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('prefix')
        .setDescription('Ganti prefix bot di server ini')
        .addStringOption(opt => opt.setName('new_prefix').setDescription('Prefix baru (misal: ! atau .) ').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('youtube')
        .setDescription('Tambah channel YouTube untuk notifikasi upload baru')
        .addStringOption(opt => opt.setName('channel_id').setDescription('ID Channel YouTube (UCxxxxxx)').setRequired(true))
        .addChannelOption(opt => opt.setName('alert_channel').setDescription('Channel Discord untuk notifikasi').setRequired(true))
    ),

  async execute(message, args) {
    const sub = args[0]?.toLowerCase() || 'view';
    const guildData = db.getGuild(message.guild.id);

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`⚙️ Konfigurasi Server: ${message.guild.name}`)
        .addFields(
          { name: '⚡ Prefix', value: `\`${guildData.prefix}\``, inline: true },
          { name: '📜 Mod Log Channel', value: guildData.modLogChannel ? `<#${guildData.modLogChannel}>` : 'Belum diatur', inline: true },
          { name: '🎭 Auto-Role (Join)', value: guildData.autoRole ? `<@&${guildData.autoRole}>` : 'Non-aktif', inline: true },
          { name: '🔊 Join to Create Channel', value: guildData.joinToCreateChannel ? `<#${guildData.joinToCreateChannel}>` : 'Belum diatur', inline: true },
          { name: '🎫 Ticket Category', value: guildData.ticketCategory ? `<#${guildData.ticketCategory}>` : 'Belum diatur', inline: true },
          { name: '🛡️ Auto-Mod Proteksi', value: `Phishing: ${guildData.autoMod?.antiPhishing ? '✅' : '❌'} | Mass Mention: ${guildData.autoMod?.antiMassMention ? '✅' : '❌'} | Anti-Invite: ${guildData.autoMod?.antiInvite ? '✅' : '❌'}`, inline: false }
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (sub === 'modlog') {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel) return message.reply({ embeds: [errorEmbed('Format Salah', 'Tag channel yang ingin dijadikan saluran log audit.')] });

      db.updateGuild(message.guild.id, data => {
        data.modLogChannel = channel.id;
      });
      return message.reply({ embeds: [successEmbed('Konfigurasi Disimpan', `Mod Log Channel telah diatur ke ${channel}.`)] });
    }

    if (sub === 'autorole') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.reply({ embeds: [errorEmbed('Format Salah', 'Tag role yang ingin dijadikan auto-role.')] });

      db.updateGuild(message.guild.id, data => {
        data.autoRole = role.id;
      });
      return message.reply({ embeds: [successEmbed('Konfigurasi Disimpan', `Auto-role saat member baru join diatur ke ${role}.`)] });
    }

    if (sub === 'prefix') {
      const newPrefix = args[1];
      if (!newPrefix) return message.reply({ embeds: [errorEmbed('Format Salah', 'Masukkan prefix baru.')] });

      db.updateGuild(message.guild.id, data => {
        data.prefix = newPrefix;
      });
      return message.reply({ embeds: [successEmbed('Konfigurasi Disimpan', `Prefix bot di server ini diubah menjadi \`${newPrefix}\`.`)] });
    }

    if (sub === 'youtube') {
      const ytChannelId = args[1];
      const alertChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
      if (!ytChannelId || !alertChannel) {
        return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan: `!config youtube <Channel_ID_YouTube> <#channel_discord>`')] });
      }

      db.updateGuild(message.guild.id, data => {
        if (!data.trackedFeeds.youtube) data.trackedFeeds.youtube = [];
        data.trackedFeeds.youtube.push({
          channelId: ytChannelId,
          alertChannelId: alertChannel.id,
          lastVideoId: null
        });
      });

      return message.reply({ embeds: [successEmbed('Notifikasi YouTube Ditambahkan', `Bot akan otomatis memantau channel \`${ytChannelId}\` dan mengirim notifikasi video baru ke ${alertChannel}.`)] });
    }
  },

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildData = db.getGuild(interaction.guild.id);

    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`⚙️ Konfigurasi Server: ${interaction.guild.name}`)
        .addFields(
          { name: '⚡ Prefix', value: `\`${guildData.prefix}\``, inline: true },
          { name: '📜 Mod Log Channel', value: guildData.modLogChannel ? `<#${guildData.modLogChannel}>` : 'Belum diatur', inline: true },
          { name: '🎭 Auto-Role (Join)', value: guildData.autoRole ? `<@&${guildData.autoRole}>` : 'Non-aktif', inline: true },
          { name: '🔊 Join to Create Channel', value: guildData.joinToCreateChannel ? `<#${guildData.joinToCreateChannel}>` : 'Belum diatur', inline: true },
          { name: '🎫 Ticket Category', value: guildData.ticketCategory ? `<#${guildData.ticketCategory}>` : 'Belum diatur', inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'modlog') {
      const channel = interaction.options.getChannel('channel');
      db.updateGuild(interaction.guild.id, data => { data.modLogChannel = channel.id; });
      return interaction.reply({ embeds: [successEmbed('Konfigurasi Disimpan', `Mod Log Channel telah diatur ke ${channel}.`)], ephemeral: true });
    }

    if (sub === 'autorole') {
      const role = interaction.options.getRole('role');
      db.updateGuild(interaction.guild.id, data => { data.autoRole = role.id; });
      return interaction.reply({ embeds: [successEmbed('Konfigurasi Disimpan', `Auto-role diatur ke ${role}.`)], ephemeral: true });
    }

    if (sub === 'prefix') {
      const p = interaction.options.getString('new_prefix');
      db.updateGuild(interaction.guild.id, data => { data.prefix = p; });
      return interaction.reply({ embeds: [successEmbed('Konfigurasi Disimpan', `Prefix diubah menjadi \`${p}\`.`)], ephemeral: true });
    }

    if (sub === 'youtube') {
      const channelId = interaction.options.getString('channel_id');
      const alertChannel = interaction.options.getChannel('alert_channel');

      db.updateGuild(interaction.guild.id, data => {
        if (!data.trackedFeeds.youtube) data.trackedFeeds.youtube = [];
        data.trackedFeeds.youtube.push({ channelId, alertChannelId: alertChannel.id, lastVideoId: null });
      });

      return interaction.reply({ embeds: [successEmbed('Notifikasi YouTube Ditambahkan', `Memantau channel \`${channelId}\` di ${alertChannel}.`)], ephemeral: true });
    }
  }
};
