const { SlashCommandBuilder, REST, Routes } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'sync',
  description: 'Sinkronisasi ulang seluruh Slash Commands ke Discord API',
  category: 'admin',
  usage: '!sync [guild/global]',
  aliases: [],
  userPermissions: [],
  botPermissions: [],
  ownerOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync slash commands (Khusus Developer)')
    .addBooleanOption(opt => opt.setName('global').setDescription('Sync global jika true (perlu waktu beberapa menit)').setRequired(false)),

  async execute(message, args) {
    if (message.author.id !== process.env.OWNER_ID) {
      return message.reply({ embeds: [errorEmbed('Akses Ditolak', 'Perintah ini hanya dapat dijalankan oleh pemilik bot.')] });
    }

    const isGlobal = args[0] === 'global';
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const slashCommands = [];

    message.client.commands.forEach(cmd => {
      if (cmd.slashData) slashCommands.push(cmd.slashData.toJSON());
    });

    try {
      const sent = await message.reply('🔄 Sedang melakukan sinkronisasi slash commands...');

      if (isGlobal) {
        await rest.put(Routes.applicationCommands(message.client.user.id), { body: slashCommands });
        await sent.edit({ embeds: [successEmbed('Sync Sukses', `Berhasil mendaftarkan **${slashCommands.length}** Slash Commands secara **Global**!`)] });
      } else {
        await rest.put(Routes.applicationGuildCommands(message.client.user.id, message.guild.id), { body: slashCommands });
        await sent.edit({ embeds: [successEmbed('Sync Sukses', `Berhasil mendaftarkan **${slashCommands.length}** Slash Commands untuk server ini (**Guild: ${message.guild.name}**)!`)] });
      }
    } catch (err) {
      console.error(err);
      return message.reply({ embeds: [errorEmbed('Sync Gagal', `Error: ${err.message}`)] });
    }
  },

  async executeSlash(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ embeds: [errorEmbed('Akses Ditolak', 'Perintah ini hanya dapat dijalankan oleh pemilik bot.')], ephemeral: true });
    }

    const isGlobal = interaction.options.getBoolean('global') || false;
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const slashCommands = [];

    interaction.client.commands.forEach(cmd => {
      if (cmd.slashData) slashCommands.push(cmd.slashData.toJSON());
    });

    await interaction.deferReply({ ephemeral: true });
    try {
      if (isGlobal) {
        await rest.put(Routes.applicationCommands(interaction.client.user.id), { body: slashCommands });
        await interaction.editReply({ embeds: [successEmbed('Sync Sukses', `Berhasil mendaftarkan **${slashCommands.length}** Slash Commands secara **Global**!`)] });
      } else {
        await rest.put(Routes.applicationGuildCommands(interaction.client.user.id, interaction.guild.id), { body: slashCommands });
        await interaction.editReply({ embeds: [successEmbed('Sync Sukses', `Berhasil mendaftarkan **${slashCommands.length}** Slash Commands untuk server ini!`)] });
      }
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed('Sync Gagal', `Error: ${err.message}`)] });
    }
  }
};
