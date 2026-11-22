const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  description: 'Menampilkan detail profil pengguna/member',
  category: 'info',
  usage: '!userinfo [user]',
  aliases: ['ui', 'whois'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Tampilkan informasi pengguna')
    .addUserOption(opt => opt.setName('user').setDescription('Member target').setRequired(false)),

  async execute(message, args) {
    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : message.author);
    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

    const roles = member ? member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(', ') || 'Tidak ada' : 'Bukan member server ini';

    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle(`👤 Informasi Pengguna: ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
        { name: '🤖 Bot?', value: targetUser.bot ? 'Ya' : 'Tidak', inline: true },
        { name: '📅 Akun Dibuat', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Bergabung ke Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
        { name: '🎭 Role', value: roles.length > 1024 ? `${roles.substring(0, 1020)}...` : roles, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const roles = member ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ') || 'Tidak ada' : 'Bukan member server ini';

    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle(`👤 Informasi Pengguna: ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true },
        { name: '🤖 Bot?', value: targetUser.bot ? 'Ya' : 'Tidak', inline: true },
        { name: '📅 Akun Dibuat', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Bergabung ke Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
        { name: '🎭 Role', value: roles.length > 1024 ? `${roles.substring(0, 1020)}...` : roles, inline: false }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
