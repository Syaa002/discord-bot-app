const db = require('../database/jsonDb');
const { checkAutoMod, isBlacklisted } = require('../modules/automod');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    // 1. Jalankan Engine Auto-Mod
    const autoModTriggered = await checkAutoMod(message);
    if (autoModTriggered) return;

    // 2. Cek Prefix dari Database Guild (default: process.env.PREFIX atau !)
    const guildData = db.getGuild(message.guild.id);
    const prefix = guildData.prefix || process.env.PREFIX || '!';

    const content = message.content.trim();
    let usedPrefix = null;

    if (content.startsWith(prefix)) {
      usedPrefix = prefix;
    } else if (content.startsWith('!')) {
      usedPrefix = '!';
    }

    if (!usedPrefix) return;

    const args = content.slice(usedPrefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    const command = client.commands.get(commandName) || client.commands.find(c => c.aliases && c.aliases.includes(commandName));
    if (!command) return;

    // 3. Cek Status Blacklist User
    const blacklistInfo = isBlacklisted(message.guild.id, message.author.id);
    if (blacklistInfo) {
      return message.reply({
        embeds: [errorEmbed('Akses Ditolak', `Anda masuk dalam daftar blacklist server ini.\n**Alasan**: ${blacklistInfo.reason}`)]
      }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }

    // 4. Cek Izin Pengguna (User Permissions)
    if (command.userPermissions && command.userPermissions.length > 0) {
      const missing = command.userPermissions.filter(perm => !message.member.permissions.has(perm));
      if (missing.length > 0) {
        return message.reply({
          embeds: [errorEmbed('Izin Kurang', `Anda memerlukan izin: \`${missing.join(', ')}\``)]
        });
      }
    }

    // 5. Cek Izin Bot (Bot Permissions)
    if (command.botPermissions && command.botPermissions.length > 0) {
      const botMember = message.guild.members.me;
      const missing = command.botPermissions.filter(perm => !botMember.permissions.has(perm));
      if (missing.length > 0) {
        return message.reply({
          embeds: [errorEmbed('Izin Bot Kurang', `Bot memerlukan izin: \`${missing.join(', ')}\``)]
        });
      }
    }

    // 6. Catat Log Perintah Terakhir
    if (!client.commandLogs) client.commandLogs = [];
    client.commandLogs.push({
      command: command.name,
      user: message.author.tag,
      channel: message.channel.id,
      timestamp: Date.now()
    });
    if (client.commandLogs.length > 50) client.commandLogs.shift();

    // 7. Eksekusi Perintah
    try {
      await command.execute(message, args, client);
    } catch (err) {
      console.error(`[Command Error] Error executing ${command.name}:`, err);
      return message.reply({
        embeds: [errorEmbed('Terjadi Kesalahan', 'Gagal menjalankan perintah tersebut.')]
      });
    }
  }
};
