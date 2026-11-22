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

// State Reaction Role Button Builder
let currentRrButtons = [];

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
    populateSelect('tiktokAlertChannelSelect', textChannels, null, 'Pilih saluran Discord...');
    populateSelect('voiceJoinChannelSelect', voiceChannels, config.joinToCreateChannel, 'Pilih saluran suara...');
    populateSelect('voiceInterfaceChannelSelect', textChannels, config.voiceInterfaceChannel, 'Pilih saluran teks (misal: #interface)...');
    populateSelect('ticketCategorySelect', categories, config.ticketCategory, 'Pilih kategori tiket...');
    populateSelect('rrChannelSelect', textChannels, null, 'Pilih saluran tujuan...');

    // Status Voice Interface
    const voiceStatusElem = document.getElementById('voiceInterfaceStatus');
    if (voiceStatusElem) {
      if (config.voiceInterfaceChannel) {
        const viName = textChannels.find(c => c.id === config.voiceInterfaceChannel)?.name || config.voiceInterfaceChannel;
        voiceStatusElem.style.display = 'block';
        voiceStatusElem.innerHTML = `✅ Terakhir disematkan ke saluran: <strong>#${viName}</strong> (Msg ID: <code>${config.voiceInterfaceMessageId || '-'}</code>)`;
      } else {
        voiceStatusElem.style.display = 'none';
      }
    }

    // Isi Pengaturan Dasar Server
    document.getElementById('guildPrefixInput').value = config.prefix || '!';

    // Isi Auto-Mod
    const autoMod = config.autoMod || {};
    document.getElementById('togglePhishing').checked = autoMod.antiPhishing !== false;
    document.getElementById('toggleMassMention').checked = autoMod.antiMassMention !== false;
    document.getElementById('toggleInvite').checked = autoMod.antiInvite !== false;

    // Render Tabel YouTube & TikTok Feeds
    renderYtFeeds(config.trackedFeeds?.youtube || [], channels);
    renderTiktokFeeds(config.trackedFeeds?.tiktok || [], channels);

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
    populateRoleAddSelect('rrRolePickerSelect', roles);

    // Render Chips Auto-Role
    renderAutoRoleChips();

    // ===================================================================
    // INITIALIZE REACTION ROLE PANELS
    // ===================================================================
    currentRrButtons = [];
    renderRrButtonsPreview();
    renderReactionRolePanels(config.reactionRoles || {}, channels);

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
  elem.innerHTML = '<option value="">Pilih role...</option>';

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

// ===================================================================
// VOICE INTERFACE PANEL SENDER (SEPERTI #INTERFACE)
// ===================================================================
document.getElementById('btnSendVoiceInterface')?.addEventListener('click', async () => {
  if (!currentGuildId) return;
  const channelId = document.getElementById('voiceInterfaceChannelSelect').value;
  if (!channelId) return showToast('Pilih saluran teks tujuan terlebih dahulu!', true);

  try {
    showToast('Sedang mengirim panel 18 tombol ke Discord...');
    const res = await fetch(`/api/guild/${currentGuildId}/voice/send-interface`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      loadGuildDetails(currentGuildId);
    } else {
      showToast(json.error || 'Gagal mengirim panel interface.', true);
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan saat mengirim panel.', true);
  }
});

// ===================================================================
// REACTION ROLE SYSTEM
// ===================================================================

// Auto-fill label ketika role dipilih
document.getElementById('rrRolePickerSelect')?.addEventListener('change', (e) => {
  const roleId = e.target.value;
  const labelInput = document.getElementById('rrButtonLabelInput');
  if (roleId && (!labelInput.value || labelInput.value.trim() === '')) {
    const r = currentGuildData?.roles?.find(item => item.id === roleId);
    if (r) labelInput.value = r.name;
  }
});

// Tambah tombol ke daftar panel builder
document.getElementById('btnAddButtonToRr')?.addEventListener('click', () => {
  const roleSelect = document.getElementById('rrRolePickerSelect');
  const roleId = roleSelect.value;
  const labelInput = document.getElementById('rrButtonLabelInput');
  const label = labelInput.value.trim();
  const style = document.getElementById('rrButtonStyleSelect').value;
  const emoji = document.getElementById('rrButtonEmojiInput').value.trim();

  if (!roleId) return showToast('Pilih role terlebih dahulu!', true);
  if (!label) return showToast('Label tombol tidak boleh kosong!', true);

  if (currentRrButtons.some(b => b.roleId === roleId)) {
    return showToast('Role ini sudah ada di tombol panel!', true);
  }

  if (currentRrButtons.length >= 25) {
    return showToast('Maksimal 25 tombol per panel!', true);
  }

  const roleObj = currentGuildData?.roles?.find(r => r.id === roleId);

  currentRrButtons.push({
    roleId,
    roleName: roleObj ? roleObj.name : label,
    label,
    style,
    emoji: emoji || null
  });

  renderRrButtonsPreview();

  // Reset input
  roleSelect.value = '';
  labelInput.value = '';
  document.getElementById('rrButtonEmojiInput').value = '';
});

// Render Preview Tombol yang dirancang
function renderRrButtonsPreview() {
  const container = document.getElementById('rrButtonsListContainer');
  if (!container) return;

  if (currentRrButtons.length === 0) {
    container.innerHTML = '<span style="color: var(--zt-text-muted); font-size: 13px;">Belum ada tombol role yang ditambahkan ke panel ini.</span>';
    return;
  }

  container.innerHTML = currentRrButtons.map((b, idx) => `
    <div class="btn-preview-item btn-preview-${b.style}">
      <span>${b.emoji ? b.emoji + ' ' : ''}${b.label}</span>
      <span style="opacity: 0.7; font-size: 11px;">(@${b.roleName})</span>
      <button type="button" class="role-chip-remove" onclick="removeRrButton(${idx})" title="Hapus tombol" style="color: #fff; margin-left: 4px;">&times;</button>
    </div>
  `).join('');
}

window.removeRrButton = function(index) {
  currentRrButtons.splice(index, 1);
  renderRrButtonsPreview();
};

// Kirim Panel Reaction Role ke Discord
document.getElementById('btnSubmitReactionRolePanel')?.addEventListener('click', async () => {
  if (!currentGuildId) return;

  const channelId = document.getElementById('rrChannelSelect').value;
  const title = document.getElementById('rrTitleInput').value.trim();
  const description = document.getElementById('rrDescInput').value.trim();

  if (!channelId) return showToast('Pilih saluran teks tujuan terlebih dahulu!', true);
  if (!title) return showToast('Judul panel embed tidak boleh kosong!', true);
  if (currentRrButtons.length === 0) return showToast('Tambahkan minimal 1 tombol role!', true);

  try {
    showToast('Sedang membuat panel Reaction Role di Discord...');
    const res = await fetch(`/api/guild/${currentGuildId}/reactionrole`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        title,
        description,
        buttons: currentRrButtons
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      currentRrButtons = [];
      renderRrButtonsPreview();
      loadGuildDetails(currentGuildId);
    } else {
      showToast(json.error || 'Gagal mengirim panel reaction role.', true);
    }
  } catch {
    showToast('Terjadi kesalahan jaringan.', true);
  }
});

// Render Daftar Panel Reaction Role Aktif
function renderReactionRolePanels(panelsObj, channels) {
  const tbody = document.getElementById('rrPanelsTableBody');
  if (!tbody) return;

  const panels = Object.entries(panelsObj || {});
  if (panels.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--zt-text-muted);">Belum ada panel reaction role yang aktif.</td></tr>';
    return;
  }

  tbody.innerHTML = panels.map(([msgId, p]) => {
    const chName = channels.find(c => c.id === p.channelId)?.name || p.channelName || p.channelId;
    const btnCount = p.buttons?.length || 0;
    return `
      <tr>
        <td>#${chName}</td>
        <td><strong>${p.title || 'Reaction Role'}</strong></td>
        <td><span class="zt-badge">${btnCount} Tombol</span></td>
        <td><code>${msgId}</code></td>
        <td>
          <button class="btn-logout" onclick="deleteReactionRolePanel('${msgId}')" style="padding: 4px 10px; font-size: 11px;">HAPUS</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteReactionRolePanel = async function(messageId) {
  if (!confirm('Hapus panel Reaction Role ini dari Discord dan database?')) return;
  try {
    const res = await fetch(`/api/guild/${currentGuildId}/reactionrole`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId })
    });
    const json = await res.json();
    showToast(json.message || 'Panel dihapus!');
    loadGuildDetails(currentGuildId);
  } catch {
    showToast('Gagal menghapus panel.', true);
  }
};

// ===================================================================
// FEEDS: YOUTUBE & TIKTOK
// ===================================================================

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

function renderTiktokFeeds(feeds, channels) {
  const tbody = document.getElementById('tiktokFeedTableBody');
  if (!tbody) return;

  if (feeds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--zt-text-muted);">Belum ada feed TikTok yang dipantau.</td></tr>';
    return;
  }

  tbody.innerHTML = feeds.map(feed => {
    const channelName = channels.find(c => c.id === feed.alertChannelId)?.name || feed.alertChannelId;
    return `
      <tr>
        <td><strong>@${feed.username}</strong></td>
        <td>#${channelName}</td>
        <td><span style="color: var(--zt-cyan); font-weight: 700;">● Aktif</span></td>
        <td>
          <button class="btn-logout" onclick="deleteTiktokFeed('${feed.username}')" style="padding: 4px 10px; font-size: 11px;">HAPUS</button>
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

// 10. Tambah Feed TikTok
document.getElementById('formAddTiktokFeed')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentGuildId) return;

  const username = document.getElementById('tiktokUsernameInput').value.trim();
  const alertChannelId = document.getElementById('tiktokAlertChannelSelect').value;

  try {
    const res = await fetch(`/api/guild/${currentGuildId}/feed/tiktok`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, alertChannelId })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      document.getElementById('tiktokUsernameInput').value = '';
      loadGuildDetails(currentGuildId);
    } else {
      showToast(json.error || 'Gagal menambahkan TikTok.', true);
    }
  } catch {
    showToast('Gagal menambahkan feed TikTok.', true);
  }
});

// Hapus Feed TikTok
window.deleteTiktokFeed = async function(username) {
  if (!confirm(`Hapus pemantauan untuk akun TikTok @${username}?`)) return;
  try {
    const res = await fetch(`/api/guild/${currentGuildId}/feed/tiktok`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const json = await res.json();
    showToast(json.message || 'Feed TikTok dihapus!');
    loadGuildDetails(currentGuildId);
  } catch {
    showToast('Gagal menghapus feed TikTok.', true);
  }
};

// 11. Ubah Status Presence Bot
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

// 12. Ganti Pilihan Server di Dropdown Topbar
document.getElementById('serverSelect')?.addEventListener('change', (e) => {
  currentGuildId = e.target.value;
  if (currentGuildId) loadGuildDetails(currentGuildId);
});

// 13. Logout
document.getElementById('btnLogout')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
});

// Inisialisasi awal
fetchStats();
fetchGuilds();
setInterval(fetchStats, 3000); // Polling status bot tiap 3 detik
