const db = require('../database/jsonDb');
const { sendLog } = require('../modules/logger');
const { COLORS } = require('../utils/embeds');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const guild = member.guild;
    const guildData = db.getGuild(guild.id);

    // 1. Pemberian Auto-Role
    if (guildData.autoRole) {
      const role = guild.roles.cache.get(guildData.autoRole);
      if (role) {
        // Cek apakah posisi role bot cukup tinggi
        const botMember = guild.members.me;
        if (botMember.roles.highest.position > role.position) {
          try {
            await member.roles.add(role, 'Auto-Role saat member baru bergabung');
          } catch (err) {
            console.error('[AutoRole] Gagal memberikan role:', err);
          }
        }
      }
    }

    // 2. Logging Member Masuk
    await sendLog(guild, {
      category: 'Member',
      title: 'Member Baru Bergabung',
      description: `${member} (\`${member.user.tag}\`) telah bergabung ke server.`,
      fields: [
        { name: 'User ID', value: `\`${member.id}\``, inline: true },
        { name: 'Usia Akun', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
      ],
      color: COLORS.SUCCESS,
      author: member.user
    });
  }
};
