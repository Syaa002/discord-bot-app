const { PermissionFlagsBits } = require('discord.js');

/**
 * Memeriksa apakah executor (pengguna yang menjalankan command)
 * dan bot memiliki izin lebih tinggi dalam hierarki role dibanding target.
 */
function checkHierarchy(executorMember, targetMember, botMember) {
  // Jika target adalah server owner, tidak bisa dimoderasi
  if (targetMember.id === targetMember.guild.ownerId) {
    return {
      allowed: false,
      reason: 'Tidak dapat melakukan tindakan pada pemilik server.'
    };
  }

  // Jika target adalah bot itu sendiri
  if (targetMember.id === botMember.id) {
    return {
      allowed: false,
      reason: 'Bot tidak dapat mengambil tindakan pada dirinya sendiri.'
    };
  }

  // Cek hierarki role antara executor dan target
  if (executorMember.id !== executorMember.guild.ownerId) {
    if (executorMember.roles.highest.position <= targetMember.roles.highest.position) {
      return {
        allowed: false,
        reason: 'Posisi role target setara atau lebih tinggi dari posisi role Anda.'
      };
    }
  }

  // Cek hierarki role antara bot dan target
  if (botMember.roles.highest.position <= targetMember.roles.highest.position) {
    return {
      allowed: false,
      reason: 'Posisi role target lebih tinggi atau setara dengan role bot.'
    };
  }

  return { allowed: true };
}

module.exports = {
  checkHierarchy
};
