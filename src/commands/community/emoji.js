const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'emoji',
  description: 'Mencari dan menampilkan emoji custom server dengan resolusi besar',
  category: 'community',
  usage: '!emoji <nama-emoji>',
  aliases: ['jumbo'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Cari emoji server')
    .addStringOption(opt => opt.setName('name').setDescription('Nama emoji').setRequired(true)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const query = args[0].replace(/:/g, '').toLowerCase();
    const emoji = message.guild.emojis.cache.find(e => e.name.toLowerCase() === query);

    if (!emoji) {
      return message.reply({ embeds: [errorEmbed('Tidak Ditemukan', `Emoji dengan nama \`${args[0]}\` tidak ditemukan di server ini.`)] });
    }

    return message.reply({ content: `${emoji.url}` });
  },

  async executeSlash(interaction) {
    const query = interaction.options.getString('name').replace(/:/g, '').toLowerCase();
    const emoji = interaction.guild.emojis.cache.find(e => e.name.toLowerCase() === query);

    if (!emoji) {
      return interaction.reply({ embeds: [errorEmbed('Tidak Ditemukan', `Emoji dengan nama \`${query}\` tidak ditemukan di server ini.`)], ephemeral: true });
    }

    return interaction.reply({ content: `${emoji.url}` });
  }
};
