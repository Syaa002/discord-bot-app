const { PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/jsonDb');
const { successEmbed, errorEmbed, infoEmbed, applyBanner } = require('../../utils/embeds');

const PROTECTED_COMMANDS = [
  'cmd',
  'command',
  'commands',
  'help',
  'config',
  'eval',
  'reload',
  'kill',
  'sync',
  'backup',
  'whitelist'
];

module.exports = {
  name: 'cmd',
  description: 'Mengaktifkan atau menonaktifkan perintah bot tertentu di server',
  category: 'admin',
  usage: '!cmd <disable|enable|toggle|list> [nama_perintah]',
  aliases: ['command', 'commands', 'cmdmanager'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('cmd')
    .setDescription('Kelola perintah bot yang aktif atau nonaktif')
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Nonaktifkan perintah bot di server ini')
        .addStringOption(opt => opt.setName('command').setDescription('Nama perintah yang ingin dinonaktifkan').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('enable')
        .setDescription('Aktifkan kembali perintah bot yang dinonaktifkan')
        .addStringOption(opt => opt.setName('command').setDescription('Nama perintah yang ingin diaktifkan').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Lihat daftar seluruh perintah yang sedang dinonaktifkan')
    ),

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const action = (args[0] || 'list').toLowerCase();
    const targetCmd = (args[1] || '').toLowerCase();

    const guildData = db.getGuild(guildId);
    let disabledCommands = Array.isArray(guildData.disabledCommands) ? [...guildData.disabledCommands] : [];

    // 1. LIST COMMANDS
    if (action === 'list') {
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`🛡️ Status Perintah Server: ${message.guild.name}`)
        .setDescription(
          disabledCommands.length > 0
            ? `Ditemukan **${disabledCommands.length}** perintah yang sedang dinonaktifkan:\n\n` +
              disabledCommands.map(c => `• \`!${c}\` / \`/${c}\``).join('\n') +
              `\n\n*Gunakan \`!cmd enable <nama>\` untuk mengaktifkannya kembali.*`
            : '✅ **Seluruh perintah bot aktif secara normal di server ini!**\nTidak ada perintah yang dinonaktifkan.'
        )
        .setFooter({ text: `Total Perintah Bot: ${client.commands.size}` })
        .setTimestamp();

      applyBanner(embed, guildId, 'mod');
      return message.reply({ embeds: [embed] });
    }

    if (!targetCmd) {
      return message.reply({
        embeds: [infoEmbed('Panduan Perintah CMD', `Gunakan format:\n• \`!cmd disable <nama>\` — Nonaktifkan perintah\n• \`!cmd enable <nama>\` — Aktifkan perintah\n• \`!cmd list\` — Lihat daftar perintah nonaktif`)]
      });
    }

    const commandObj = client.commands.get(targetCmd) || client.commands.find(c => c.aliases && c.aliases.includes(targetCmd));
    if (!commandObj) {
      return message.reply({
        embeds: [errorEmbed('Perintah Tidak Ditemukan', `Perintah \`${targetCmd}\` tidak terdaftar pada sistem bot.`)]
      });
    }

    const canonicalName = commandObj.name.toLowerCase();

    if (PROTECTED_COMMANDS.includes(canonicalName)) {
      return message.reply({
        embeds: [errorEmbed('Perintah Terlindungi', `Perintah \`${canonicalName}\` adalah perintah inti sistem dan **tidak dapat dinonaktifkan** demi keamanan bot.`)]
      });
    }

    // 2. DISABLE COMMAND
    if (action === 'disable') {
      if (disabledCommands.includes(canonicalName)) {
        return message.reply({
          embeds: [infoEmbed('Sudah Nonaktif', `Perintah \`${canonicalName}\` memang sudah dinonaktifkan sebelumnya.`)]
        });
      }

      disabledCommands.push(canonicalName);
      db.updateGuild(guildId, data => {
        data.disabledCommands = disabledCommands;
      });

      return message.reply({
        embeds: [successEmbed('Perintah Dinonaktifkan', `Perintah \`!${canonicalName}\` & \`/${canonicalName}\` berhasil **dinonaktifkan** untuk server ini.`)]
      });
    }

    // 3. ENABLE COMMAND
    if (action === 'enable') {
      if (!disabledCommands.includes(canonicalName)) {
        return message.reply({
          embeds: [infoEmbed('Sudah Aktif', `Perintah \`${canonicalName}\` sedang aktif dan tidak dalam daftar nonaktif.`)]
        });
      }

      disabledCommands = disabledCommands.filter(c => c !== canonicalName);
      db.updateGuild(guildId, data => {
        data.disabledCommands = disabledCommands;
      });

      return message.reply({
        embeds: [successEmbed('Perintah Diaktifkan Kembali', `Perintah \`!${canonicalName}\` & \`/${canonicalName}\` berhasil **diaktifkan kembali**.`)]
      });
    }

    // 4. TOGGLE COMMAND
    if (action === 'toggle') {
      const isCurrentlyDisabled = disabledCommands.includes(canonicalName);
      if (isCurrentlyDisabled) {
        disabledCommands = disabledCommands.filter(c => c !== canonicalName);
      } else {
        disabledCommands.push(canonicalName);
      }

      db.updateGuild(guildId, data => {
        data.disabledCommands = disabledCommands;
      });

      return message.reply({
        embeds: [
          isCurrentlyDisabled
            ? successEmbed('Perintah Diaktifkan', `Perintah \`!${canonicalName}\` kini telah **aktif** kembali.`)
            : successEmbed('Perintah Dinonaktifkan', `Perintah \`!${canonicalName}\` kini telah **dinonaktifkan**.`)
        ]
      });
    }

    return message.reply({
      embeds: [errorEmbed('Aksi Tidak Dikenal', 'Pilihan aksi: `disable`, `enable`, `toggle`, `list`')]
    });
  },

  async executeSlash(interaction, client) {
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();
    const guildData = db.getGuild(guildId);
    let disabledCommands = Array.isArray(guildData.disabledCommands) ? [...guildData.disabledCommands] : [];

    if (subcommand === 'list') {
      const embed = new EmbedBuilder()
        .setColor(0xFF758F)
        .setTitle(`🛡️ Status Perintah Server: ${interaction.guild.name}`)
        .setDescription(
          disabledCommands.length > 0
            ? `Ditemukan **${disabledCommands.length}** perintah yang sedang dinonaktifkan:\n\n` +
              disabledCommands.map(c => `• \`!${c}\` / \`/${c}\``).join('\n') +
              `\n\n*Gunakan \`/cmd enable\` untuk mengaktifkannya kembali.*`
            : '✅ **Seluruh perintah bot aktif secara normal di server ini!**\nTidak ada perintah yang dinonaktifkan.'
        )
        .setFooter({ text: `Total Perintah Bot: ${client.commands.size}` })
        .setTimestamp();

      applyBanner(embed, guildId, 'mod');
      return interaction.reply({ embeds: [embed] });
    }

    const targetCmd = interaction.options.getString('command').toLowerCase();
    const commandObj = client.commands.get(targetCmd) || client.commands.find(c => c.aliases && c.aliases.includes(targetCmd));

    if (!commandObj) {
      return interaction.reply({
        embeds: [errorEmbed('Perintah Tidak Ditemukan', `Perintah \`${targetCmd}\` tidak terdaftar pada sistem bot.`)],
        ephemeral: true
      });
    }

    const canonicalName = commandObj.name.toLowerCase();

    if (PROTECTED_COMMANDS.includes(canonicalName)) {
      return interaction.reply({
        embeds: [errorEmbed('Perintah Terlindungi', `Perintah \`${canonicalName}\` adalah perintah inti sistem dan **tidak dapat dinonaktifkan** demi keamanan bot.`)],
        ephemeral: true
      });
    }

    if (subcommand === 'disable') {
      if (disabledCommands.includes(canonicalName)) {
        return interaction.reply({
          embeds: [infoEmbed('Sudah Nonaktif', `Perintah \`${canonicalName}\` memang sudah dinonaktifkan sebelumnya.`)],
          ephemeral: true
        });
      }

      disabledCommands.push(canonicalName);
      db.updateGuild(guildId, data => {
        data.disabledCommands = disabledCommands;
      });

      return interaction.reply({
        embeds: [successEmbed('Perintah Dinonaktifkan', `Perintah \`!${canonicalName}\` & \`/${canonicalName}\` berhasil **dinonaktifkan** untuk server ini.`)]
      });
    }

    if (subcommand === 'enable') {
      if (!disabledCommands.includes(canonicalName)) {
        return interaction.reply({
          embeds: [infoEmbed('Sudah Aktif', `Perintah \`${canonicalName}\` sedang aktif dan tidak dalam daftar nonaktif.`)],
          ephemeral: true
        });
      }

      disabledCommands = disabledCommands.filter(c => c !== canonicalName);
      db.updateGuild(guildId, data => {
        data.disabledCommands = disabledCommands;
      });

      return interaction.reply({
        embeds: [successEmbed('Perintah Diaktifkan Kembali', `Perintah \`!${canonicalName}\` & \`/${canonicalName}\` berhasil **diaktifkan kembali**.`)]
      });
    }
  }
};
