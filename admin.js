// Admin helper functions
function getUserKey(domain, username){
  if(!domain || !username) return null;
  return `user_${domain}_${username}`;
}

function getUserByKey(key){
  if (!key) return null;
  if (window.firebaseAPI?.isEnabled) {
    const profile = window.firebaseAPI.getUserProfile(key);
    if (profile) {
      return profile;
    }
  }

  if (Array.isArray(window.serverUsers) && window.serverUsers.length) {
    const serverMatch = window.serverUsers.find(u => u.key === key || u.userKey === key);
    if (serverMatch) {
      return normalizeUserProfile(serverMatch, key);
    }
  }

  return null;
}

function saveUser(key, userObj){
  if (!key || !userObj) return;
  if (window.fetch) {
    fetch('/api/saveUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userKey: key, userObj })
    }).then(async response => {
      if (!response.ok) {
        console.warn('Global saveUser API returned failure', response.status);
        // Try Firebase fallback when server returns 405 or 5xx
        if ((response.status === 405 || response.status >= 500) && window.firebaseAPI?.isEnabled && window.firebaseAPI.saveUserProfile) {
          try {
            await window.firebaseAPI.saveUserProfile(key, userObj);
          } catch (ferr) {
            console.warn('Firebase fallback save failed', ferr);
            return;
          }
        } else {
          return;
        }
      }
      if (Array.isArray(window.serverUsers)) {
        const existing = window.serverUsers.findIndex(u => u.key === key || u.userKey === key);
        if (existing >= 0) {
          window.serverUsers[existing] = { key, ...userObj };
        } else {
          window.serverUsers.push({ key, ...userObj });
        }
      } else {
        window.serverUsers = [{ key, ...userObj }];
      }
      renderAccountManager?.();
      renderStatsOverview?.();
    }).catch(err => {
      console.warn('Global save attempt failed', err);
    });
  }
}

window.serverUsers = [];

async function loadServerUsers(){
  if (!window.fetch) return;
  try {
    const res = await fetch('/api/users');
    if (!res.ok) return;
    const keys = await res.json();
    if (!Array.isArray(keys)) return;
    const serverUsers = [];
    for (const key of keys) {
      if (!key || typeof key !== 'string') continue;
      try {
        const userRes = await fetch(`/api/getUser/${encodeURIComponent(key)}`);
        if (!userRes.ok) continue;
        const userData = await userRes.json();
        if (userData) {
          serverUsers.push({ key, ...userData });
        }
      } catch (err) {
        console.warn('Failed to fetch remote user', key, err);
      }
    }
    window.serverUsers = serverUsers;
    renderAccountManager();
    renderStatsOverview();
  } catch (error) {
    console.warn('Failed to load server users', error);
  }
}

function getAllUserKeys(){
  if (Array.isArray(window.serverUsers) && window.serverUsers.length) {
    return window.serverUsers.map(u => u.key || u.userKey).filter(Boolean);
  }
  return [];
}

function normalizeUserProfile(user, key){
  if (!user || !key) return null;
  const normalized = {...user};
  if (!normalized.domain && typeof key === 'string' && key.startsWith('user_')) {
    const parts = key.split('_');
    if (parts.length >= 3) {
      normalized.domain = normalized.domain || parts[1];
      normalized.username = normalized.username || parts.slice(2).join('_');
    }
  }
  if (!normalized.username && normalized.userKey) {
    const parts = normalized.userKey.split('_');
    if (parts.length >= 3) normalized.username = parts.slice(2).join('_');
  }
  return normalized;
}

function getAllUsers(){
  const usersByKey = new Map();

  if (Array.isArray(window.serverUsers)) {
    window.serverUsers.forEach(raw => {
      const key = raw.key || raw.userKey;
      if (!key) return;
      const normalized = normalizeUserProfile(raw, key);
      usersByKey.set(key, { key, user: normalized });
    });
  }

  if (window.firebaseAPI?.isEnabled && Array.isArray(window.firebaseAPI.usersCache)) {
    window.firebaseAPI.usersCache.forEach(raw => {
      const key = raw.key || raw.userKey;
      if (!key) return;
      const normalized = normalizeUserProfile(raw, key);
      if (usersByKey.has(key)) {
        const existing = usersByKey.get(key).user;
        usersByKey.set(key, { key, user: { ...existing, ...normalized } });
      } else {
        usersByKey.set(key, { key, user: normalized });
      }
    });
  }

  return Array.from(usersByKey.values()).filter(x => x.user);
}

// Admin login used by admin-login.html
async function adminLogin(domain, username, password){
  const key = getUserKey(domain, username);
  let user = getUserByKey(key);
  let verified = false;
  // If we have a local user object with password, verify locally
  if (user && user.password) {
    if (user.password === password) verified = true;
  }
  // Otherwise try verifying with the global server without exposing passwords
  if (!verified && window.fetch) {
    try {
      const verifyResp = await fetch('/api/checkPassword', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userKey: key, password })
      });
      if (verifyResp.ok) {
        verified = true;
        // fetch non-sensitive user profile data
        try {
          const response = await fetch(`/api/getUser/${encodeURIComponent(key)}`);
          if (response.ok) user = await response.json();
        } catch (err) { /* ignore profile fetch errors */ }
      }
    } catch (err) {
      console.warn('Admin login fetch failed', err);
    }
  }
  if (!verified) return {success:false,message:'Invalid credentials'};
  if(!user) return {success:false,message:'User not found'};
  if(!user.isAdmin) return {success:false,message:'User is not an admin'};
  localStorage.setItem('currentUser', username);
  localStorage.setItem('currentUserKey', key);
  localStorage.setItem('currentSchool', domain);
  localStorage.setItem('isAdmin', 'true');
  return {success:true};
}

function getAdminStorageKey() {
  const currentUser = localStorage.getItem('currentUser');
  const currentUserKey = localStorage.getItem('currentUserKey');
  if (currentUserKey) return currentUserKey;
  if (currentUser && currentUser.startsWith('user_')) return currentUser;
  return null;
}

function requireAdminRedirect(){
  const currentUser = localStorage.getItem('currentUser');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const key = getAdminStorageKey();
  if (!currentUser || !isAdmin) {
    window.location.href = 'cyberbull-landing.html';
    return;
  }
  if (!key) {
    window.location.href = 'cyberbull-landing.html';
    return;
  }
  const user = getUserByKey(key);
  if(!user || !user.isAdmin) {
    window.location.href = 'cyberbull-landing.html';
    return;
  }
}

// Account Manager UI
function renderAccountManager(){
  const container = document.getElementById('amTable');
  const search = document.getElementById('amSearch').value.trim().toLowerCase();
  const filterDomain = document.getElementById('amFilterDomain').value.trim().toLowerCase();
  const rows = getAllUsers().filter(x=>{
    const u = x.user;
    if(filterDomain && u.domain.indexOf(filterDomain)===-1) return false;
    if(!search) return true;
    return u.username.toLowerCase().includes(search) || u.domain.toLowerCase().includes(search);
  });

  if(rows.length===0){ container.innerHTML = '<div class="small">No users found.</div>'; return; }

  let html = '<table><thead><tr><th>Username</th><th>Domain</th><th>Admin</th><th>XP</th><th>Level</th><th>Streak</th><th>Actions</th></tr></thead><tbody>';
  rows.forEach(r=>{
    const u = r.user;
    html += `<tr><td>${escapeHtml(u.username)}</td><td class="small">${escapeHtml(u.domain || 'unknown')}</td><td>${u.isAdmin ? 'Yes' : 'No'}</td><td>${u.xp||0}</td><td>${u.level||1}</td><td>${u.streak||0}</td><td class="table-actions">`+
      `<button class="btn primary" onclick="inspectUser('${escapeAttr(r.key)}')">Inspect</button> `+
      `<button class="btn muted" onclick="toggleAdmin('${escapeAttr(r.key)}', ${u.isAdmin})">${u.isAdmin ? 'Revoke' : 'Grant'} Admin</button> `+
      `<button class="btn muted" onclick="resetPassword('${escapeAttr(r.key)}')">Reset PW</button> `+
      `<button class="btn danger" onclick="deleteUser('${escapeAttr(r.key)}')">Delete</button>`+
      `</td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleAdmin(key, currentAdmin) {
  const user = getUserByKey(key);
  if (!user) return;
  user.isAdmin = !currentAdmin;
  saveUser(key, user);
  renderAccountManager();
  renderStatsOverview();
}

function getRecentUsers(count = 5) {
  return getAllUsers()
    .map(x => x.user)
    .filter(u => u?.lastActive)
    .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
    .slice(0, count);
}

function inspectUser(key){
  const data = getUserByKey(key);
  const container = document.getElementById('inspectorContainer');
  if(!data){ container.innerHTML = '<div class="small">User not found</div>'; return; }
  window.currentInspectKey = key;

  let html = `<h3>${escapeHtml(data.username)} @ ${escapeHtml(data.domain)}</h3>`;
  html += `<div class="small">XP: ${data.xp||0} — Level: ${data.level||1} — Achievements: ${(data.achievements||[]).length} — Streak: ${data.streak||0} — Coins: ${data.coins||0}</div>`;
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">';
  html += `<div><label>XP</label><input id="inspectXpInput" type="number" value="${escapeAttr(data.xp||0)}" style="width:100px"></div>`;
  html += `<div><label>Level</label><input id="inspectLevelInput" type="number" value="${escapeAttr(data.level||1)}" style="width:100px"></div>`;
  html += `<div><label>Streak</label><input id="inspectStreakInput" type="number" value="${escapeAttr(data.streak||0)}" style="width:100px"></div>`;
  html += `<div><label>Coins</label><input id="inspectCoinsInput" type="number" value="${escapeAttr(data.coins||0)}" style="width:100px"></div>`;
  html += '</div>';
  html += `<button class="btn primary" onclick="saveUserAdminChanges('${key}')">Save changes</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','xp',100)">+100 XP</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','level',1)">+1 Level</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','streak',1)">+1 Streak</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','coins',50)">+50 Coins</button>`;

  html += '<h4 style="margin-top:18px;">Study Sessions</h4>';
  if((data.sessions||[]).length===0) html += '<div class="small">No sessions recorded</div>'; else html += '<ul>'+(data.sessions.map(s=>`<li>${escapeHtml(s.date||s.start)}: ${escapeHtml(s.duration||0)} mins</li>`).join(''))+'</ul>';
  html += '<h4>Weekly Progress (last 7 days)</h4>';
  const last7 = (data.sessions||[]).slice(-7);
  html += '<div class="small">Sessions last 7: '+last7.length+'</div>';
  html += '<h4>Goals</h4>';
  if((data.goals||[]).length===0) html += '<div class="small">No goals</div>'; else html += '<ul>'+(data.goals.map(g=>`<li>${escapeHtml(g)}</li>`).join(''))+'</ul>';
  html += '<h4>XP History</h4>';
  if((data.xpHistory||[]).length===0) html += '<div class="small">No XP history</div>'; else html += '<ul>'+(data.xpHistory.map(x=>`<li>${escapeHtml(x.date)}: ${escapeHtml(x.delta)} XP</li>`).join(''))+'</ul>';
  container.innerHTML = html;
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelector('[data-tab="inspector"]').classList.add('active');
  ['accounts','stats','inspector','tools'].forEach(id=>document.getElementById(id).style.display = (id==='inspector')?'block':'none');
}

function saveUserAdminChanges(key){
  const user = getUserByKey(key);
  if(!user) return;
  const xp = Number(document.getElementById('inspectXpInput').value) || 0;
  const level = Number(document.getElementById('inspectLevelInput').value) || 1;
  const streak = Number(document.getElementById('inspectStreakInput').value) || 0;
  const coins = Number(document.getElementById('inspectCoinsInput').value) || 0;

  user.xp = xp;
  user.level = level;
  user.streak = streak;
  user.coins = coins;

  saveUser(key,user);
  inspectUser(key);
  renderAccountManager();
}

function modifyUserAmount(key, field, amount){
  const user = getUserByKey(key);
  if(!user) return;
  const current = Number(user[field] || 0);
  user[field] = current + Number(amount);
  if(field==='level' && user[field] < 1) user[field] = 1;
  if(field==='streak' && user[field] < 0) user[field] = 0;
  if(field==='xp' && user[field] < 0) user[field] = 0;
  if(field==='coins' && user[field] < 0) user[field] = 0;
  saveUser(key,user);
  inspectUser(key);
  renderAccountManager();
}

function deleteUser(key){
  if(!confirm('Delete this user? This action cannot be undone.')) return;
  if (!window.fetch) {
    showAlert('Global delete is unavailable.');
    return;
  }
  fetch('/api/deleteUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userKey: key })
  }).then(async response => {
      if (!response.ok) {
      const payload = await response.json().catch(() => null);
      showAlert(payload?.error || 'Failed to delete user globally.');
      return;
    }
    if (Array.isArray(window.serverUsers)) {
      window.serverUsers = window.serverUsers.filter(u => (u.key || u.userKey) !== key);
    }
    localStorage.removeItem(key);
    renderAccountManager();
    renderStatsOverview();
  }).catch(err => {
    console.warn('Delete user failed', err);
    showAlert('Failed to delete user globally.');
  });
}

function toggleSuspend(key){
  const u = getUserByKey(key);
  if(!u) return;
  u.suspended = !u.suspended;
  saveUser(key,u);
  renderAccountManager();
}

async function resetPassword(key){
  const u = getUserByKey(key);
  if(!u) return;
  const newPw = await showPrompt('Enter new password for user (or leave blank to set default):', 'password123');
  u.password = newPw || 'password123';
  saveUser(key,u);
  showAlert('Password reset');
}

// Stats
function renderStatsOverview(){
  const container = document.getElementById('statsContainer');
  const users = getAllUsers().map(x=>x.user);
  const total = users.length;
  const active = users.filter(u=>{ if(!u.lastActive) return false; const d = new Date(u.lastActive); return (Date.now()-d.getTime()) < (1000*60*60*24*30); }).length;
  const adminCount = users.filter(u=>u.isAdmin).length;
  const totalStudy = users.reduce((s,u)=>s + (u.studyHours||0),0);
  const mostActive = users.slice().sort((a,b)=> (b.studyHours||0)-(a.studyHours||0)).slice(0,5);
  const domainCounts = {};
  users.forEach(u=> domainCounts[u.domain || 'unknown'] = (domainCounts[u.domain || 'unknown']||0)+1);
  const topDomains = Object.entries(domainCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const recent = getRecentUsers(5);

  document.getElementById('totalUsersMetric').textContent = total;
  document.getElementById('activeUsersMetric').textContent = active;
  document.getElementById('adminCountMetric').textContent = adminCount;

  let html = `<div class="row"><div class="col"><strong>Study time</strong><div class="small">${totalStudy} hours total</div></div><div class="col"><strong>Top domains</strong><div class="small">${topDomains.map(d=>`${d[0]} (${d[1]})`).slice(0,3).join(', ') || 'No data'}</div></div><div class="col"><strong>Recent activity</strong><div class="small">${recent.length ? recent.map(u => `${u.username} (${new Date(u.lastActive).toLocaleDateString()})`).join(', ') : 'No recent activity'}</div></div></div>`;
  html += '<div class="metrics-list"><div class="metric-card"><strong>Top active students</strong><span>' + (mostActive.length? mostActive.map(u=>`${u.username} — ${u.studyHours||0}h`).join('<br>') : 'No data') + '</span></div></div>';
  container.innerHTML = html;
}

// Admin Tools
function getGlobalList(key){
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
}

function saveGlobalList(key, list){
  localStorage.setItem(key, JSON.stringify(list));
}

function renderAdminTools(){
  const anns = getGlobalList('announcements');
  document.getElementById('announcementsList').innerHTML = anns.map((a,i)=>`<div>${i+1}. ${a}</div>`).join('')||'<div class="small">No announcements</div>';

  const ch = getGlobalList('challenges');
  document.getElementById('challengesList').innerHTML = ch.map((c,i)=>`<div>${i+1}. ${c}</div>`).join('')||'<div class="small">No challenges</div>';

  const achievements = getGlobalList('globalAchievements');
  document.getElementById('achievementsList').innerHTML = achievements.length
    ? achievements.map((a,i)=>`<div style="display:flex;justify-content:space-between;align-items:center"><span>${i+1}. ${a}</span><button class="btn muted" onclick="removeAchievement(${i})">Remove</button></div>`).join('')
    : '<div class="small">No achievements</div>';

  const xpRewards = getGlobalList('xpRewards');
  document.getElementById('xpRewardsList').innerHTML = xpRewards.length
    ? xpRewards.map((reward,i)=>`<div style="display:flex;justify-content:space-between;align-items:center"><span>${reward.label}: ${reward.value} XP</span><button class="btn muted" onclick="removeXpReward(${i})">Remove</button></div>`).join('')
    : '<div class="small">No XP rewards defined</div>';
}

function addAnnouncement(){
  const value = document.getElementById('announceInput').value.trim();
  if(!value) return;
  const list = getGlobalList('announcements');
  list.unshift(value);
  saveGlobalList('announcements', list);
  document.getElementById('announceInput').value = '';
  renderAdminTools();
}

function addChallenge(){
  const value = document.getElementById('challengeInput').value.trim();
  if(!value) return;
  const list = getGlobalList('challenges');
  list.unshift(value);
  saveGlobalList('challenges', list);
  document.getElementById('challengeInput').value = '';
  renderAdminTools();
}

function addAchievement(){
  const value = document.getElementById('achievementInput').value.trim();
  if(!value) return;
  const list = getGlobalList('globalAchievements');
  list.unshift(value);
  saveGlobalList('globalAchievements', list);
  document.getElementById('achievementInput').value = '';
  renderAdminTools();
}

function removeAchievement(index){
  const list = getGlobalList('globalAchievements');
  list.splice(index, 1);
  saveGlobalList('globalAchievements', list);
  renderAdminTools();
}

function saveXpReward(){
  const label = document.getElementById('xpRewardLabelInput').value.trim();
  const value = Number(document.getElementById('xpRewardValueInput').value);
  if(!label || Number.isNaN(value)) return;
  const list = getGlobalList('xpRewards');
  const existing = list.find(item => item.label === label);
  if(existing) {
    existing.value = value;
  } else {
    list.unshift({ label, value });
  }
  saveGlobalList('xpRewards', list);
  document.getElementById('xpRewardLabelInput').value = '';
  document.getElementById('xpRewardValueInput').value = '';
  renderAdminTools();
}

function removeXpReward(index){
  const list = getGlobalList('xpRewards');
  list.splice(index, 1);
  saveGlobalList('xpRewards', list);
  renderAdminTools();
}

function loadAdminTools(){
  document.getElementById('announceBtn').addEventListener('click', addAnnouncement);
  document.getElementById('challengeBtn').addEventListener('click', addChallenge);
  document.getElementById('achievementBtn').addEventListener('click', addAchievement);
  document.getElementById('xpRewardBtn').addEventListener('click', saveXpReward);
    document.getElementById('adminSecretBtn').addEventListener('click', ()=>{
    const v = document.getElementById('adminSecretInput').value.trim();
    if(!v) return;
    localStorage.setItem('adminSecret', v);
    showAlert('Admin secret updated');
    document.getElementById('adminSecretInput').value='';
  });
  renderAdminTools();
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (document.getElementById('announceBtn')) loadAdminTools();
});

// Expose functions globally for inline handlers
window.adminLogin = adminLogin;
window.requireAdminRedirect = requireAdminRedirect;
window.renderAccountManager = renderAccountManager;
window.renderStatsOverview = renderStatsOverview;
window.inspectUser = inspectUser;
window.deleteUser = deleteUser;
window.toggleSuspend = toggleSuspend;
window.resetPassword = resetPassword;
window.removeXpReward = removeXpReward;
window.renderAdminTools = renderAdminTools;
