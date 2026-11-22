// ===================================================================
// ZERO TWO DASHBOARD FRONTEND LOGIC
// ===================================================================

let currentGuildId = null;
let currentGuildData = null;

// State Auto-Role Server yang Dipilih
let autoRoleState = {
  enabled: false,
  userRoles: [],
  botRoles: [],
  delaySeconds: 0
};

// Tampilkan Toast Notifikasi
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.style.borderColor = isError ? 'var(--zt-red-bright)' : 'var(--zt-pink)';
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

// Format Detik ke Waktu
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}h ${h}j ${m}m`;
}

// 1. Inisialisasi Navigasi Tab
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetTabId = link.getAttribute('data-tab');

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

    link.classList.add('active');
    const targetPane = document.getElementById(targetTabId);
    if (targetPane) targetPane.style.display = 'block';
  });
});

// 2. Fetch Statistik Bot Real-Time
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    const data = await res.json();

    document.getElementById('botTagText').innerText = data.botTag;
    document.getElementById('valPing').innerText = `${data.ping} ms`;
    document.getElementById('valGuilds').innerText = data.guildsCount;
    document.getElementById('valUsers').innerText = data.usersCount;
    document.getElementById('valUptime').innerText = formatUptime(data.uptime);
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// 3. Fetch Daftar Server (Guilds)
async function fetchGuilds() {
  try {
    const res = await fetch('/api/guilds');
    const data = await res.json();
    const select = document.getElementById('serverSelect');
    select.innerHTML = '';

    if (!data.guilds || data.guilds.length === 0) {
      select.innerHTML = '<option value="">Belum ada server yang terhubung</option>';
      return;
    }

    data.guilds.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.innerText = `${g.name} (${g.memberCount} member)`;
      select.appendChild(opt);
    });

    currentGuildId = data.guilds[0].id;
    loadGuildDetails(currentGuildId);
  } catch (err) {
    console.error('Error fetching guilds:', err);
  }
}

// 4. Muat Rincian Server Tertentu
async function loadGuildDetails(guildId) {
  try {
    const res = await fetch(`/api/guild/${guildId}`);
    const data = await res.json();
    currentGuildData = data;

    const channels = data.channels || [];
    const roles = data.roles || [];
    const config = data.config || {};

    // Isi Dropdown Saluran Teks & Suara
    const textChannels = channels.filter(c => c.type === 0);
    const voiceChannels = channels.filter(c => c.type === 2);
    const categories = channels.filter(c => c.type === 4);

    populateSelect('modLogChannelSelect', textChannels, config.modLogChannel, 'Pilih saluran log...');
    populateSelect('ytAlertChannelSelect', textChannels, null, 'Pilih saluran Discord...');
    populateSelect('voiceJoinChannelSelect', voiceChannels, config.joinToCreateChannel, 'Pilih saluran suara...');
    populateSelect('ticketCategorySelect', categories, config.ticketCategory, 'Pilih kategori tiket...');

    // Isi Pengaturan Dasar Server
    document.getElementById('guildPrefixInput').value = config.prefix || '!';

    // Isi Auto-Mod
    const autoMod = config.autoMod || {};
    document.getElementById('togglePhishing').checked = autoMod.antiPhishing !== false;
    document.getElementById('toggleMassMention').checked = autoMod.antiMassMention !== false;
    document.getElementById('toggleInvite').checked = autoMod.antiInvite !== false;

    // Render Tabel YouTube Feeds
    renderYtFeeds(config.trackedFeeds?.youtube || [], channels);

    // ===================================================================
    // INITIALIZE ADVANCED AUTO-ROLE SYSTEM
    // ===================================================================
    autoRoleState = config.autoRole || { enabled: false, userRoles: [], botRoles: [], delaySeconds: 0 };

    // Tampilkan Info Hierarki Role Bot
    const botInfo = data.botInfo || {};
    document.getElementById('botHighestRoleLabel').innerText = `${botInfo.highestRoleName || 'Tidak Diketahui'} (Posisi #${botInfo.highestRolePosition || 0})`;

    document.getElementById('toggleAutoRoleMaster').checked = autoRoleState.enabled;
    document.getElementById('autoRoleDelaySelect').value = String(autoRoleState.delaySeconds || 0);

    // Isi Dropdown Pilih Role untuk Ditambahkan
    populateRoleAddSelect('selectAddUserRole', roles);
    populateRoleAddSelect('selectAddBotRole', roles);

    // Render Chips Role yang Sedang Aktif
    renderAutoRoleChips();

    // Render Giveaway
    const gwContainer = document.getElementById('giveawayListContainer');
    const activeGw = config.activeGiveaways ? Object.entries(config.activeGiveaways) : [];
    if (activeGw.length > 0) {
      gwContainer.innerHTML = activeGw.map(([msgId, gw]) => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--zt-border); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
          <h4 style="color: var(--zt-pink);">🎉 ${gw.prize}</h4>
          <p style="font-size: 13px; color: var(--zt-text-muted);">
            Peserta: <strong>${gw.participants?.length || 0} orang</strong> | 
            Pemenang: <strong>${gw.winnersCount}</strong> | 
            Selesai: <span style="color: var(--zt-cyan);">${new Date(gw.endsAt).toLocaleTimeString()}</span>
          </p>
        </div>
      `).join('');
    } else {
      gwContainer.innerHTML = 'Tidak ada giveaway yang sedang berlangsung di server ini.';
    }

  } catch (err) {
    console.error('Error loading guild details:', err);
  }
}

function populateSelect(elemId, items, selectedVal, defaultLabel) {
  const elem = document.getElementById(elemId);
  if (!elem) return;
  elem.innerHTML = `<option value="">${defaultLabel}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.innerText = item.name;
    if (item.id === selectedVal) opt.selected = true;
    elem.appendChild(opt);
  });
}

// Dropdown khusus penambahan role dengan indikator warna & hierarki
function populateRoleAddSelect(elemId, roles) {
  const elem = document.getElementById(elemId);
  if (!elem) return;
  elem.innerHTML = '<option value="">Pilih role untuk ditambahkan...</option>';

  roles.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    if (r.assignable) {
      opt.innerText = `● ${r.name}`;
    } else {
      opt.innerText = `⚠️ ${r.name} (Role bot di bawah ini)`;
      opt.disabled = true;
    }
    elem.appendChild(opt);
  });
}

// Render Badge/Chips untuk User Roles & Bot Roles
function renderAutoRoleChips() {
  const roles = currentGuildData?.roles || [];

  // 1. User Roles Chips
  const userContainer = document.getElementById('userRolesChipsContainer');
  if (autoRoleState.userRoles.length === 0) {
    userContainer.innerHTML = '<span style="color: var(--zt-text-muted); font-size: 13px;">Belum ada role member yang dipilih.</span>';
  } else {
    userContainer.innerHTML = autoRoleState.userRoles.map(roleId => {
      const r = roles.find(item => item.id === roleId) || { name: 'Role Tidak Dikenal', color: '#99AAB5' };
      const dotColor = r.color && r.color !== '#000000' ? r.color : 'var(--zt-pink)';
      return `
        <div class="role-chip">
          <span class="role-color-dot" style="background-color: ${dotColor};"></span>
          <span>${r.name}</span>
          <button type="button" class="role-chip-remove" onclick="removeUserRole('${roleId}')" title="Hapus role ini">&times;</button>
        </div>
      `;
    }).join('');
  }

  // 2. Bot Roles Chips
  const botContainer = document.getElementById('botRolesChipsContainer');
  if (autoRoleState.botRoles.length === 0) {
    botContainer.innerHTML = '<span style="color: var(--zt-text-muted); font-size: 13px;">Belum ada role bot yang dipilih.</span>';
  } else {
    botContainer.innerHTML = autoRoleState.botRoles.map(roleId => {
      const r = roles.find(item => item.id === roleId) || { name: 'Role Tidak Dikenal', color: '#99AAB5' };
      const dotColor = r.color && r.color !== '#000000' ? r.color : 'var(--zt-cyan)';
      return `
        <div class="role-chip">
          <span class="role-color-dot" style="background-color: ${dotColor};"></span>
          <span>${r.name}</span>
          <button type="button" class="role-chip-remove" onclick="removeBotRole('${roleId}')" title="Hapus role ini">&times;</button>
        </div>
      `;
    }).join('');
  }
}

// Tambah / Hapus Role User
window.removeUserRole = function(roleId) {
  autoRoleState.userRoles = autoRoleState.userRoles.filter(id => id !== roleId);
  renderAutoRoleChips();
};

document.getElementById('btnAddUserRole')?.addEventListener('click', () => {
  const select = document.getElementById('selectAddUserRole');
  const roleId = select.value;
  if (!roleId) return showToast('Pilih role terlebih dahulu!', true);

  if (autoRoleState.userRoles.includes(roleId)) {
    return showToast('Role ini sudah ada dalam daftar!', true);
  }

  autoRoleState.userRoles.push(roleId);
  renderAutoRoleChips();
  select.value = '';
});

// Tambah / Hapus Role Bot
window.removeBotRole = function(roleId) {
  autoRoleState.botRoles = autoRoleState.botRoles.filter(id => id !== roleId);
  renderAutoRoleChips();
};

document.getElementById('btnAddBotRole')?.addEventListener('click', () => {
  const select = document.getElementById('selectAddBotRole');
  const roleId = select.value;
  if (!roleId) return showToast('Pilih role bot terlebih dahulu!', true);

  if (autoRoleState.botRoles.includes(roleId)) {
    return showToast('Role ini sudah ada dalam daftar!', true);
  }

  autoRoleState.botRoles.push(roleId);
  renderAutoRoleChips();
  select.value = '';
});

// Simpan Konfigurasi Lengkap Auto-Role
document.getElementById('btnSaveAutoRoleConfig')?.addEventListener('click', async () => {
  if (!currentGuildId) return;

  const enabled = document.getElementById('toggleAutoRoleMaster').checked;
  const delaySeconds = parseInt(document.getElementById('autoRoleDelaySelect').value, 10) || 0;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/autorole`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        delaySeconds,
        userRoles: autoRoleState.userRoles,
        botRoles: autoRoleState.botRoles
      })
    });
    const json = await res.json();
    showToast(json.message || 'Konfigurasi Auto-Role berhasil disimpan!');
  } catch {
    showToast('Gagal menyimpan konfigurasi Auto-Role.', true);
  }
});

function renderYtFeeds(feeds, channels) {
  const tbody = document.getElementById('ytFeedTableBody');
  if (feeds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--zt-text-muted);">Belum ada feed YouTube yang dipantau.</td></tr>';
    return;
  }

  tbody.innerHTML = feeds.map(feed => {
    const channelName = channels.find(c => c.id === feed.alertChannelId)?.name || feed.alertChannelId;
    return `
      <tr>
        <td><code>${feed.channelId}</code></td>
        <td>#${channelName}</td>
        <td><span style="color: var(--zt-cyan); font-weight: 700;">● Aktif</span></td>
        <td>
          <button class="btn-logout" onclick="deleteYtFeed('${feed.channelId}')" style="padding: 4px 10px; font-size: 11px;">HAPUS</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 5. Simpan Konfigurasi Umum Server (Prefix & Mod-Log)
document.getElementById('btnSaveGeneralSettings')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const prefix = document.getElementById('guildPrefixInput').value;
  const modLogChannel = document.getElementById('modLogChannelSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, modLogChannel })
    });
    const json = await res.json();
    showToast(json.message || 'Pengaturan berhasil disimpan!');
  } catch {
    showToast('Gagal menyimpan pengaturan.', true);
  }
});

// 6. Simpan Auto-Mod
document.getElementById('btnSaveAutoMod')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const antiPhishing = document.getElementById('togglePhishing').checked;
  const antiMassMention = document.getElementById('toggleMassMention').checked;
  const antiInvite = document.getElementById('toggleInvite').checked;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/automod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ antiPhishing, antiMassMention, antiInvite })
    });
    const json = await res.json();
    showToast(json.message || 'Proteksi Auto-Mod disimpan!');
  } catch {
    showToast('Gagal menyimpan konfigurasi Auto-Mod.', true);
  }
});

// 7. Simpan Voice Join-to-Create
document.getElementById('btnSaveVoiceChannel')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const joinToCreateChannel = document.getElementById('voiceJoinChannelSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinToCreateChannel })
    });
    const json = await res.json();
    showToast(json.message || 'Saluran Voice disimpan!');
  } catch {
    showToast('Gagal menyimpan saluran voice.', true);
  }
});

// 8. Simpan Tiket Kategori
document.getElementById('btnSaveTicketConfig')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const ticketCategory = document.getElementById('ticketCategorySelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketCategory })
    });
    const json = await res.json();
    showToast(json.message || 'Kategori tiket disimpan!');
  } catch {
    showToast('Gagal menyimpan konfigurasi tiket.', true);
  }
});

// 9. Tambah Feed YouTube
document.getElementById('formAddYtFeed')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentGuildId) return;

  const channelId = document.getElementById('ytChannelIdInput').value.trim();
  const alertChannelId = document.getElementById('ytAlertChannelSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/feed/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, alertChannelId })
    });
    const json = await res.json();
    showToast(json.message || 'Feed YouTube ditambahkan!');
    document.getElementById('ytChannelIdInput').value = '';
    loadGuildDetails(currentGuildId);
  } catch {
    showToast('Gagal menambahkan feed.', true);
  }
});

// Hapus Feed YouTube
window.deleteYtFeed = async function(channelId) {
  if (!confirm(`Hapus pemantauan untuk channel YouTube ${channelId}?`)) return;
  try {
    const res = await fetch(`/api/guild/${currentGuildId}/feed/youtube`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId })
    });
    const json = await res.json();
    showToast(json.message || 'Feed dihapus!');
    loadGuildDetails(currentGuildId);
  } catch {
    showToast('Gagal menghapus feed.', true);
  }
};

// 10. Ubah Status Presence Bot
document.getElementById('presenceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const activityType = document.getElementById('presenceType').value;
  const statusText = document.getElementById('presenceText').value.trim();

  try {
    const res = await fetch('/api/bot/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityType, statusText })
    });
    const json = await res.json();
    showToast(json.message || 'Status bot diperbarui!');
  } catch {
    showToast('Gagal memperbarui status.', true);
  }
});

// 11. Ganti Pilihan Server di Dropdown Topbar
document.getElementById('serverSelect')?.addEventListener('change', (e) => {
  currentGuildId = e.target.value;
  if (currentGuildId) loadGuildDetails(currentGuildId);
});

// 12. Logout
document.getElementById('btnLogout')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
});

// Inisialisasi awal
fetchStats();
fetchGuilds();
setInterval(fetchStats, 3000); // Polling status bot tiap 3 detik
