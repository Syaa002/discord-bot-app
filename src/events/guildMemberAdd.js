const { EmbedBuilder } = require('discord.js');
const db = require('../database/jsonDb');
const { sendLog } = require('../modules/logger');
const { COLORS, applyBanner } = require('../utils/embeds');

function normalizeAutoRole(cfg) {
  if (!cfg) return { enabled: false, userRoles: [], botRoles: [], delaySeconds: 0 };
  if (typeof cfg === 'string') {
    return { enabled: true, userRoles: [cfg], botRoles: [], delaySeconds: 0 };
  }
  return {
    enabled: Boolean(cfg.enabled),
    userRoles: Array.isArray(cfg.userRoles) ? cfg.userRoles : [],
    botRoles: Array.isArray(cfg.botRoles) ? cfg.botRoles : [],
    delaySeconds: parseInt(cfg.delaySeconds, 10) || 0
  };
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const guild = member.guild;
    const guildData = db.getGuild(guild.id);
    const autoRoleConfig = normalizeAutoRole(guildData.autoRole);

    // 1. Pemberian Auto-Role (Jika Diaktifkan)
    if (autoRoleConfig.enabled) {
      const isBot = member.user.bot;
      const targetRoleIds = isBot ? autoRoleConfig.botRoles : autoRoleConfig.userRoles;
      const botMember = guild.members.me;

      if (targetRoleIds && targetRoleIds.length > 0) {
        const assignRoles = async () => {
          const rolesToAdd = [];
          for (const roleId of targetRoleIds) {
            const role = guild.roles.cache.get(roleId);
            if (role && !role.managed && role.id !== guild.id) {
              if (botMember.roles.highest.position > role.position) {
                rolesToAdd.push(role);
              } else {
                console.warn(`[AutoRole] Posisi role bot tidak cukup tinggi untuk memberikan ${role.name}`);
              }
            }
          }

          if (rolesToAdd.length > 0) {
            try {
              await member.roles.add(rolesToAdd, 'Auto-Role saat member baru bergabung');
            } catch (err) {
              console.error('[AutoRole] Gagal menambahkan role:', err);
            }
          }
        };

        if (autoRoleConfig.delaySeconds > 0) {
          setTimeout(assignRoles, autoRoleConfig.delaySeconds * 1000);
        } else {
          await assignRoles();
        }
      }
    }

    // 2. Pesan Sambutan Member Baru (Welcome Message)
    const welcomeChannelId = guildData.welcomeChannel;
    const welcomeChannel = welcomeChannelId
      ? guild.channels.cache.get(welcomeChannelId)
      : guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('welcome') || c.name.includes('sambutan') || c.name.includes('selamat-datang')));

    if (welcomeChannel && welcomeChannel.isTextBased()) {
      try {
        const welcomeEmbed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle(`✨ Selamat Datang di ${guild.name}!`)
          .setDescription(`Halo ${member}, selamat datang di server! Kamu adalah member ke-**${guild.memberCount}**.\nSemoga betah dan silakan cek channel yang tersedia. ✨`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setFooter({ text: 'Vespera Welcome System • Server Core' })
          .setTimestamp();

        applyBanner(welcomeEmbed, guild.id, 'welcome');
        await welcomeChannel.send({ content: `Selamat datang ${member}! 🎉`, embeds: [welcomeEmbed] });
      } catch (err) {
        console.error('[Welcome] Gagal mengirim pesan sambutan:', err);
      }
    }

    // 3. Logging Member Masuk
    await sendLog(guild, {
      category: 'Member',
      title: 'Member Baru Bergabung',
      description: `${member} (\`${member.user.tag}\`) telah bergabung ke server.`,
      fields: [
        { name: 'User ID', value: `\`${member.id}\``, inline: true },
        { name: 'Tipe Akun', value: member.user.bot ? '🤖 Bot' : '👤 Pengguna', inline: true },
        { name: 'Usia Akun', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
      ],
      color: COLORS.SUCCESS,
      author: member.user
    });
  }
};
