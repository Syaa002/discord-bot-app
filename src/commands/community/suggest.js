const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, applyBanner } = require('../../utils/embeds');

module.exports = {
  name: 'suggest',
  description: 'Mengirimkan ide/saran pengembangan server untuk di-vote',
  category: 'community',
  usage: '!suggest <ide/saran Anda>',
  aliases: ['idea', 'saran'],
  userPermissions: [],
  botPermissions: ['AddReactions'],
  slashData: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Kirimkan saran/ide untuk server')
    .addStringOption(opt => opt.setName('idea').setDescription('Ide atau saran Anda').setRequired(true)),

  async execute(message, args) {
    if (!args[0]) return message.reply({ embeds: [errorEmbed('Format Salah', `Gunakan: \`${this.usage}\``)] });

    const idea = args.join(' ');
    const suggestChannel = message.guild.channels.cache.find(c => c.name.includes('suggest') || c.name.includes('saran')) || message.channel;

    const embed = new EmbedBuilder()
      .setColor(0xFFB703)
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
      .setTitle('💡 Saran Komunitas Baru')
      .setDescription(idea)
      .setFooter({ text: 'Beri reaksi 👍 untuk setuju atau 👎 jika tidak setuju.' })
      .setTimestamp();

    applyBanner(embed, message.guild?.id, 'community');

    const msg = await suggestChannel.send({ embeds: [embed] });
    await msg.react('👍');
    await msg.react('👎');

    if (suggestChannel.id !== message.channel.id) {
      await message.reply({ embeds: [successEmbed('Saran Terkirim', `Saran Anda berhasil dikirim ke ${suggestChannel}.`)] });
    }
  },

  async executeSlash(interaction) {
    const idea = interaction.options.getString('idea');
    const suggestChannel = interaction.guild.channels.cache.find(c => c.name.includes('suggest') || c.name.includes('saran')) || interaction.channel;

    const embed = new EmbedBuilder()
      .setColor(0xFFB703)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTitle('💡 Saran Komunitas Baru')
      .setDescription(idea)
      .setFooter({ text: 'Beri reaksi 👍 untuk setuju atau 👎 jika tidak setuju.' })
      .setTimestamp();

    applyBanner(embed, message.guild?.id, 'community');

    const msg = await suggestChannel.send({ embeds: [embed] });
    await msg.react('👍');
    await msg.react('👎');

    return interaction.reply({ embeds: [successEmbed('Saran Terkirim', `Saran Anda berhasil dikirim ke ${suggestChannel}.`)], ephemeral: true });
  }
};
