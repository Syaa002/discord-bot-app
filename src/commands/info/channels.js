const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: 'channels',
  description: 'Menampilkan daftar channel server berdasarkan kategori',
  category: 'info',
  usage: '!channels',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('channels')
    .setDescription('Tampilkan daftar channel server'),

  async execute(message) {
    const textChannels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`💬 Statistik Saluran Server: ${message.guild.name}`)
      .addFields(
        { name: '📁 Kategori', value: `**${categories}** kategori`, inline: true },
        { name: '💬 Teks', value: `**${textChannels}** channel`, inline: true },
        { name: '🔊 Suara (Voice)', value: `**${voiceChannels}** channel`, inline: true },
        { name: '📊 Total Saluran', value: `**${message.guild.channels.cache.size}** total`, inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const textChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`💬 Statistik Saluran Server: ${interaction.guild.name}`)
      .addFields(
        { name: '📁 Kategori', value: `**${categories}** kategori`, inline: true },
        { name: '💬 Teks', value: `**${textChannels}** channel`, inline: true },
        { name: '🔊 Suara (Voice)', value: `**${voiceChannels}** channel`, inline: true },
        { name: '📊 Total Saluran', value: `**${interaction.guild.channels.cache.size}** total`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
