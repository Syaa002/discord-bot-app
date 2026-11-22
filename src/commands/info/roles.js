const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { applyBanner } = require('../../utils/embeds');

module.exports = {
  name: 'roles',
  description: 'Menampilkan seluruh role server beserta jumlah dan posisinya',
  category: 'info',
  usage: '!roles',
  aliases: ['rolelist'],
  userPermissions: [],
  botPermissions: [],
  slashData: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Tampilkan daftar seluruh role server'),

  async execute(message) {
    const roles = message.guild.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r} (\`${r.members.size} member\`)`);

    const text = roles.slice(0, 30).join('\n') || 'Tidak ada role.';

    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle(`🎭 Daftar Role Server (${roles.length})`)
      .setDescription(roles.length > 30 ? `${text}\n*...dan ${roles.length - 30} role lainnya.*` : text)
      .setTimestamp();

    applyBanner(embed, message.guild?.id, 'serverinfo');

    return message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const roles = interaction.guild.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r} (\`${r.members.size} member\`)`);

    const text = roles.slice(0, 30).join('\n') || 'Tidak ada role.';

    const embed = new EmbedBuilder()
      .setColor(0xFF758F)
      .setTitle(`🎭 Daftar Role Server (${roles.length})`)
      .setDescription(roles.length > 30 ? `${text}\n*...dan ${roles.length - 30} role lainnya.*` : text)
      .setTimestamp();

    applyBanner(embed, interaction.guild?.id, 'serverinfo');

    return interaction.reply({ embeds: [embed] });
  }
};
