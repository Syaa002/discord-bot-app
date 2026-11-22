const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'serverinfo',
  description: 'Menampilkan informasi lengkap mengenai server ini',
  category: 'info',
  usage: '!serverinfo',
  aliases: ['si'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Tampilkan informasi server'),

  async execute(message) {
    const guild = message.guild;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🏰 Informasi Server: ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 1024 }) || null)
      .addFields(
        { name: '👑 Pemilik', value: `${owner.user.tag} (\`${owner.id}\`)`, inline: true },
        { name: '👥 Jumlah Member', value: `Total: **${guild.memberCount}**`, inline: true },
        { name: '🚀 Boost Level', value: `Level **${guild.premiumTier}** (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
        { name: '📅 Dibuat Pada', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: '💬 Total Channel', value: `**${guild.channels.cache.size}** saluran`, inline: true },
        { name: '🎭 Total Role', value: `**${guild.roles.cache.size}** role`, inline: true },
        { name: '🔒 Tingkat Verifikasi', value: `${guild.verificationLevel}`, inline: true }
      )
      .setFooter({ text: `ID Server: ${guild.id}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🏰 Informasi Server: ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 1024 }) || null)
      .addFields(
        { name: '👑 Pemilik', value: `${owner.user.tag} (\`${owner.id}\`)`, inline: true },
        { name: '👥 Jumlah Member', value: `Total: **${guild.memberCount}**`, inline: true },
        { name: '🚀 Boost Level', value: `Level **${guild.premiumTier}** (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
        { name: '📅 Dibuat Pada', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: '💬 Total Channel', value: `**${guild.channels.cache.size}** saluran`, inline: true },
        { name: '🎭 Total Role', value: `**${guild.roles.cache.size}** role`, inline: true },
        { name: '🔒 Tingkat Verifikasi', value: `${guild.verificationLevel}`, inline: true }
      )
      .setFooter({ text: `ID Server: ${guild.id}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
