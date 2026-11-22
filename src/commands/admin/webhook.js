const { PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'webhook',
  description: 'Membuat webhook aman dengan token unik di channel',
  category: 'admin',
  usage: '!webhook create <nama> [channel]',
  aliases: [],
  userPermissions: [PermissionFlagsBits.ManageWebhooks],
  botPermissions: [PermissionFlagsBits.ManageWebhooks],

  async execute(message, args) {
    if (args[0] !== 'create' || !args[1]) {
      return message.reply({ embeds: [errorEmbed('Format Salah', 'Gunakan: `!webhook create <nama> [channel]`')] });
    }

    const channel = message.mentions.channels.first() || message.channel;
    const name = args.slice(1).filter(a => !a.startsWith('<#')).join(' ');

    try {
      const webhook = await channel.createWebhook({
        name,
        avatar: message.client.user.displayAvatarURL(),
        reason: `Dibuat oleh ${message.author.tag}`
      });

      // Kirim URL ke DM pembuat demi keamanan
      await message.author.send({
        embeds: [
          successEmbed(
            'Webhook Dibuat',
            `Webhook **${name}** di channel ${channel} berhasil dibuat!\n\n` +
            `🔗 **URL Webhook**:\n\`${webhook.url}\`\n\n` +
            `⚠️ *Jangan bagikan URL ini kepada orang yang tidak berhak.*`
          )
        ]
      }).catch(() => {});

      return message.reply({ embeds: [successEmbed('Webhook Siap', `Webhook **${name}** berhasil dibuat di ${channel}. Detail URL telah dikirimkan ke DM Anda demi keamanan.`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed('Error', 'Gagal membuat webhook.')] });
    }
  }
};
