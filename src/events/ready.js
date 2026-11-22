const { ActivityType } = require('discord.js');
const { startNotificationService } = require('../modules/notificationFeeds');
const { refreshAllInterfacePanels } = require('../modules/voiceRooms');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`🤖 Bot Discord berhasil online sebagai: ${client.user.tag}`);
    console.log(`🏰 Terhubung ke ${client.guilds.cache.size} server Discord.`);

    // Atur status default
    client.user.setActivity('Vespera • Server System', { type: ActivityType.Playing });

    // Mulai layanan background pemantauan notifikasi YouTube & TikTok
    startNotificationService(client);

    // Otomatis perbarui panel voice interface ke format minimalis jika sudah pernah dipasang
    await refreshAllInterfacePanels(client).catch(err => console.error('[Ready] Refresh panels error:', err));
  }
};
