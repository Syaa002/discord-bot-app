const {
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');
const db = require('../../database/jsonDb');
const { successEmbed, errorEmbed, applyBanner } = require('../../utils/embeds');

module.exports = {
  name: 'reactionrole',
  description: 'Membuat panel Reaction Role berbasis tombol klik untuk memilih role',
  category: 'panels',
  usage: '!reactionrole <role> <label-tombol> <deskripsi>',
  aliases: ['rr'],
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  slashData: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Buat tombol reaction role')
    .addRoleOption(opt => opt.setName('role').setDescription('Role yang akan diberikan/dicabut').setRequired(true))
    .addStringOption(opt => opt.setName('label').setDescription('Teks pada tombol').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Keterangan role').setRequired(true)),

  async execute(message, args) {
    if (!args[0] || !args[1] || !args[2]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });
    }

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    if (!role) return message.reply({ embeds: [errorEmbed('Role Tidak Ditemukan', 'Pastikan mention atau berikan Role ID yang tepat.')] });

    const label = args[1];
    const description = args.slice(2).join(' ');

    const embed = new EmbedBuilder()
      .setColor(role.color || 0xFF758F)
      .setTitle(`🎭 Ambil Role: ${role.name}`)
      .setDescription(`${description}\n\n👉 Klik tombol di bawah untuk **mengambil** atau **melepas** role ${role}.`)
      .setTimestamp();

    applyBanner(embed, message.guild.id, 'reactionrole');

    const button = new ButtonBuilder()
      .setCustomId(`rr_${role.id}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => {});
  },

  async executeSlash(interaction) {
    const role = interaction.options.getRole('role');
    const label = interaction.options.getString('label');
    const description = interaction.options.getString('description');

    const embed = new EmbedBuilder()
      .setColor(role.color || 0xFF758F)
      .setTitle(`🎭 Ambil Role: ${role.name}`)
      .setDescription(`${description}\n\n👉 Klik tombol di bawah untuk **mengambil** atau **melepas** role ${role}.`)
      .setTimestamp();

    applyBanner(embed, message.guild.id, 'reactionrole');

    const button = new ButtonBuilder()
      .setCustomId(`rr_${role.id}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: '✅ Panel reaction role berhasil dibuat!', ephemeral: true });
  }
};
