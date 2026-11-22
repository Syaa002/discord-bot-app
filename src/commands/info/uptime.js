const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'uptime',
  description: 'Menampilkan lama waktu bot online dan timestamp deploy',
  category: 'info',
  usage: '!uptime',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Tampilkan durasi bot aktif'),

  async execute(message) {
    const uptimeSec = process.uptime();
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = Math.floor(uptimeSec % 60);

    const startTime = Date.now() - (uptimeSec * 1000);

    const embed = infoEmbed(
      '⏱️ Status Uptime Bot',
      `🟢 **Durasi Aktif**: **${days}h ${hours}j ${minutes}m ${seconds}d**\n` +
      `🚀 **Online Sejak**: <t:${Math.floor(startTime / 1000)}:F> (<t:${Math.floor(startTime / 1000)}:R>)`
    );

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const uptimeSec = process.uptime();
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = Math.floor(uptimeSec % 60);

    const startTime = Date.now() - (uptimeSec * 1000);

    const embed = infoEmbed(
      '⏱️ Status Uptime Bot',
      `🟢 **Durasi Aktif**: **${days}h ${hours}j ${minutes}m ${seconds}d**\n` +
      `🚀 **Online Sejak**: <t:${Math.floor(startTime / 1000)}:F> (<t:${Math.floor(startTime / 1000)}:R>)`
    );

    return interaction.reply({ embeds: [embed] });
  }
};
