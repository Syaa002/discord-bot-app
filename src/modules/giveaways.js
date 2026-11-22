const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const db = require('../database/jsonDb');
const { sendLog } = require('./logger');
const { COLORS } = require('../utils/embeds');

function createGiveawayButtons(count = 0) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gw_enter')
      .setLabel(`Ikut (${count})`)
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('gw_leave')
      .setLabel('Keluar')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function startGiveaway(channel, { prize, durationMs, winnersCount, hostUser }) {
  const endsAt = Date.now() + durationMs;
  const embed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle(`🎉 GIVEAWAY: ${prize}`)
    .setDescription(
      `Klik tombol **Ikut** di bawah untuk berpartisipasi!\n\n` +
      `👑 **Host**: ${hostUser}\n` +
      `🏆 **Pemenang**: **${winnersCount}** orang\n` +
      `⏰ **Berakhir**: <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:f>)`
    )
    .setFooter({ text: 'Semoga beruntung!' })
    .setTimestamp(endsAt);

  const row = createGiveawayButtons(0);
  const msg = await channel.send({ embeds: [embed], components: [row] });

  db.updateGuild(channel.guild.id, data => {
    data.activeGiveaways[msg.id] = {
      channelId: channel.id,
      prize,
      endsAt,
      winnersCount,
      hostId: hostUser.id,
      participants: []
    };
  });

  setTimeout(() => endGiveaway(channel.client, channel.guild.id, msg.id), durationMs);
  return msg;
}

async function endGiveaway(client, guildId, messageId) {
  const guildData = db.getGuild(guildId);
  const gwData = guildData.activeGiveaways[messageId];
  if (!gwData) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(gwData.channelId);
  if (!channel) return;

  const msg = await channel.messages.fetch(messageId).catch(() => null);
  if (!msg) return;

  const participants = gwData.participants || [];
  let winners = [];

  if (participants.length > 0) {
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    winners = shuffled.slice(0, gwData.winnersCount);
  }

  const winnersText = winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'Tidak ada peserta yang memenuhi syarat.';

  const endedEmbed = new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`🎉 GIVEAWAY SELESAI: ${gwData.prize}`)
    .setDescription(
      `🏆 **Pemenang**: ${winnersText}\n` +
      `👑 **Host**: <@${gwData.hostId}>\n` +
      `👥 **Total Peserta**: ${participants.length}`
    )
    .setTimestamp();

  await msg.edit({ embeds: [endedEmbed], components: [] });

  if (winners.length > 0) {
    await channel.send(`🎉 Selamat kepada ${winnersText}! Anda memenangkan **${gwData.prize}**! Hubungi <@${gwData.hostId}> untuk klaim.`);
  } else {
    await channel.send(`😢 Giveaway untuk **${gwData.prize}** berakhir tanpa ada peserta.`);
  }

  db.updateGuild(guildId, data => {
    delete data.activeGiveaways[messageId];
  });

  await sendLog(guild, {
    category: 'Giveaway',
    title: 'Giveaway Selesai',
    description: `Giveaway **${gwData.prize}** selesai. Pemenang: ${winnersText}`,
    color: COLORS.WARNING
  });
}

async function handleGiveawayInteraction(interaction) {
  if (!interaction.isButton()) return;
  const { customId, message, user, guild } = interaction;
  if (!customId.startsWith('gw_')) return;

  const guildData = db.getGuild(guild.id);
  const gwData = guildData.activeGiveaways[message.id];

  if (!gwData) {
    return interaction.reply({ content: '❌ Giveaway ini telah berakhir atau tidak ditemukan.', ephemeral: true });
  }

  if (customId === 'gw_enter') {
    if (gwData.participants.includes(user.id)) {
      return interaction.reply({ content: 'ℹ️ Anda sudah bergabung dalam giveaway ini.', ephemeral: true });
    }

    db.updateGuild(guild.id, data => {
      data.activeGiveaways[message.id].participants.push(user.id);
    });

    const updatedCount = gwData.participants.length + 1;
    await message.edit({ components: [createGiveawayButtons(updatedCount)] });
    return interaction.reply({ content: '✅ Anda berhasil bergabung dalam giveaway! Semoga menang 🎉', ephemeral: true });
  }

  if (customId === 'gw_leave') {
    if (!gwData.participants.includes(user.id)) {
      return interaction.reply({ content: 'ℹ️ Anda belum bergabung dalam giveaway ini.', ephemeral: true });
    }

    db.updateGuild(guild.id, data => {
      data.activeGiveaways[message.id].participants = data.activeGiveaways[message.id].participants.filter(id => id !== user.id);
    });

    const updatedCount = Math.max(0, gwData.participants.length - 1);
    await message.edit({ components: [createGiveawayButtons(updatedCount)] });
    return interaction.reply({ content: '🚪 Anda telah keluar dari giveaway.', ephemeral: true });
  }
}

module.exports = {
  startGiveaway,
  endGiveaway,
  handleGiveawayInteraction
};
