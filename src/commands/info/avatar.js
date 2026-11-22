const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'avatar',
  description: 'Menampilkan foto profil (avatar) dan banner pengguna',
  category: 'info',
  usage: '!avatar [user]',
  aliases: ['av', 'pfp'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Tampilkan foto avatar pengguna')
    .addUserOption(opt => opt.setName('user').setDescription('Target pengguna').setRequired(false)),

  async execute(message, args) {
    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : message.author);
    const avatarUrl = targetUser.displayAvatarURL({ size: 1024, extension: 'png' });

    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle(`🖼️ Avatar: ${targetUser.tag}`)
      .setImage(avatarUrl)
      .setDescription(`[Unduh Avatar HD](${avatarUrl})`);

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const avatarUrl = targetUser.displayAvatarURL({ size: 1024, extension: 'png' });

    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle(`🖼️ Avatar: ${targetUser.tag}`)
      .setImage(avatarUrl)
      .setDescription(`[Unduh Avatar HD](${avatarUrl})`);

    return interaction.reply({ embeds: [embed] });
  }
};
