const { PermissionFlagsBits } = require('discord.js');
const db = require('../database/jsonDb');
const { sendLog } = require('./logger');
const { COLORS } = require('../utils/embeds');

const PHISHING_REGEX = /(?:discord(?:app)?\.(?:gift|gifts|net|org|co|gg\/nitro)|dlscord|discrod|nitro-gift|steamcommuniity|free-nitro|airdrop-nitro)/i;
const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9\-]+)/i;

async function checkAutoMod(message) {
  if (!message.guild || message.author.bot) return false;

  const member = message.member;
  if (!member) return false;

  // Lewati jika administrator
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return false;

  const guildData = db.getGuild(message.guild.id);
  const autoModConfig = guildData.autoMod || {};

  // 1. Cek Anti-Phishing Link
  if (autoModConfig.antiPhishing && PHISHING_REGEX.test(message.content)) {
    try {
      await message.delete();
      await member.timeout(24 * 60 * 60 * 1000, 'AutoMod: Terdeteksi mengirim link phishing/scam');
      
      await message.channel.send({
        content: `⚠️ ${message.author}, pesan Anda dihapus dan Anda diberi timeout karena mengirim link scam/phishing!`
      }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));

      await sendLog(message.guild, {
        category: 'AutoMod',
        title: 'Deteksi Link Phishing',
        description: `Pengguna ${message.author} (\`${message.author.id}\`) mengirim link mencurigakan di ${message.channel}.`,
        fields: [
          { name: 'Isi Pesan', value: message.content.substring(0, 1000) },
          { name: 'Tindakan', value: 'Pesan dihapus & Timeout 24 jam' }
        ],
        color: COLORS.ERROR,
        author: message.author
      });

      return true; // Dihandle AutoMod
    } catch (err) {
      console.error('[AutoMod] Error phishing handler:', err);
    }
  }

  // 2. Cek Anti-Mass Mention
  if (autoModConfig.antiMassMention) {
    const maxMentions = autoModConfig.maxMentions || 5;
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;

    if (mentionCount >= maxMentions || (message.mentions.everyone && !member.permissions.has(PermissionFlagsBits.MentionEveryone))) {
      try {
        await message.delete();
        await member.timeout(1 * 60 * 60 * 1000, 'AutoMod: Spam Mass Mention');

        await message.channel.send({
          content: `⚠️ ${message.author}, dilarang melakukan mass mention!`
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));

        await sendLog(message.guild, {
          category: 'AutoMod',
          title: 'Mass Mention Terdeteksi',
          description: `Pengguna ${message.author} (\`${message.author.id}\`) melakukan mention ${mentionCount} pengguna di ${message.channel}.`,
          fields: [{ name: 'Tindakan', value: 'Pesan dihapus & Timeout 1 jam' }],
          color: COLORS.WARNING,
          author: message.author
        });

        return true;
      } catch (err) {
        console.error('[AutoMod] Error mass mention handler:', err);
      }
    }
  }

  // 3. Cek Anti-Invite Link
  if (autoModConfig.antiInvite && INVITE_REGEX.test(message.content)) {
    try {
      await message.delete();
      await message.channel.send({
        content: `⚠️ ${message.author}, dilarang membagikan link invite server lain!`
      }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));

      await sendLog(message.guild, {
        category: 'AutoMod',
        title: 'Link Invite Terdeteksi',
        description: `Pengguna ${message.author} (\`${message.author.id}\`) mengirim link invite di ${message.channel}.`,
        fields: [{ name: 'Pesan', value: message.content.substring(0, 1000) }],
        color: COLORS.WARNING,
        author: message.author
      });

      return true;
    } catch (err) {
      console.error('[AutoMod] Error invite handler:', err);
    }
  }

  return false;
}

function isBlacklisted(guildId, userId) {
  const guildData = db.getGuild(guildId);
  const entry = guildData.blacklistedUsers ? guildData.blacklistedUsers[userId] : null;
  if (!entry) return false;

  // Cek kedaluwarsa
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    db.updateGuild(guildId, data => {
      delete data.blacklistedUsers[userId];
    });
    return false;
  }

  return entry;
}

module.exports = {
  checkAutoMod,
  isBlacklisted
};
