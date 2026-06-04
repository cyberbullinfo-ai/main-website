// Admin helper functions
function getUserKey(domain, username){
  if(!domain || !username) return null;
  return `user_${domain}_${username}`;
}

function getUserByKey(key){
  if (window.firebaseAPI?.isEnabled) {
    const profile = window.firebaseAPI.getUserProfile(key);
    if (profile) {
      return profile;
    }
  }

  const raw = localStorage.getItem(key);
  if(!raw) return null;
  try{
    return JSON.parse(raw);
  }catch(e){
    const keyParts = key.split('_');
    if(keyParts.length >= 3){
      const username = keyParts.slice(2).join('_');
      const domain = keyParts[1];
      return {
        username,
        domain,
        password: raw,
        xp: 0,
        level: 1,
        achievements: [],
        streak: 0,
        suspended: false,
        studyHours: 0,
        sessions: [],
        goals: [],
        lastActive: null,
        isAdmin: false
      };
    }
    return null;
  }
}

function saveUser(key, userObj){
  localStorage.setItem(key, JSON.stringify(userObj));
  if (window.firebaseAPI?.isEnabled && window.firebaseAPI.saveUserProfile) {
    window.firebaseAPI.saveUserProfile(key, userObj).catch(err => {
      console.error('Failed to save user profile to Firebase', err);
    });
  }
}

function getAllUserKeys(){
  const keys = [];
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('user_')) keys.push(k);
  }
  return keys;
}

function getAllUsers(){
  return getAllUserKeys().map(k=>({key:k,user:getUserByKey(k)})).filter(x=>x.user);
}

// Admin login used by admin-login.html
async function adminLogin(domain, username, password){
  const key = getUserKey(domain, username);
  const user = getUserByKey(key);
  if(!user) return {success:false,message:'User not found'};
  if(user.password !== password) return {success:false,message:'Invalid credentials'};
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
  if (currentUser === 'admin') {
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

  let html = '<table><thead><tr><th>Username</th><th>Domain</th><th>XP</th><th>Level</th><th>Achievements</th><th>Streak</th><th>Actions</th></tr></thead><tbody>';
  rows.forEach(r=>{
    const u = r.user;
    html += `<tr><td>${u.username}</td><td class="small">${u.domain}</td><td>${u.xp||0}</td><td>${u.level||1}</td><td>${(u.achievements||[]).length}</td><td>${u.streak||0}</td><td>`+
      `<button class="btn primary" onclick="inspectUser('${r.key}')">Inspect</button> `+
      `<button class="btn muted" onclick="toggleSuspend('${r.key}')">${u.suspended? 'Unsuspend':'Suspend'}</button> `+
      `<button class="btn" onclick="resetPassword('${r.key}')">Reset PW</button> `+
      `<button class="btn danger" onclick="deleteUser('${r.key}')">Delete</button>`+
      `</td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function inspectUser(key){
  const data = getUserByKey(key);
  const container = document.getElementById('inspectorContainer');
  if(!data){ container.innerHTML = '<div class="small">User not found</div>'; return; }
  window.currentInspectKey = key;

  let html = `<h3>${data.username} @ ${data.domain}</h3>`;
  html += `<div class="small">XP: ${data.xp||0} — Level: ${data.level||1} — Achievements: ${(data.achievements||[]).length} — Streak: ${data.streak||0} — Coins: ${data.coins||0}</div>`;
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">';
  html += `<div><label>XP</label><input id="inspectXpInput" type="number" value="${data.xp||0}" style="width:100px"></div>`;
  html += `<div><label>Level</label><input id="inspectLevelInput" type="number" value="${data.level||1}" style="width:100px"></div>`;
  html += `<div><label>Streak</label><input id="inspectStreakInput" type="number" value="${data.streak||0}" style="width:100px"></div>`;
  html += `<div><label>Coins</label><input id="inspectCoinsInput" type="number" value="${data.coins||0}" style="width:100px"></div>`;
  html += '</div>';
  html += `<button class="btn primary" onclick="saveUserAdminChanges('${key}')">Save changes</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','xp',100)">+100 XP</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','level',1)">+1 Level</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','streak',1)">+1 Streak</button> `;
  html += `<button class="btn" onclick="modifyUserAmount('${key}','coins',50)">+50 Coins</button>`;

  html += '<h4 style="margin-top:18px;">Study Sessions</h4>';
  if((data.sessions||[]).length===0) html += '<div class="small">No sessions recorded</div>'; else html += '<ul>'+(data.sessions.map(s=>`<li>${s.date||s.start}: ${s.duration||0} mins</li>`).join(''))+'</ul>';
  html += '<h4>Weekly Progress (last 7 days)</h4>';
  const last7 = (data.sessions||[]).slice(-7);
  html += '<div class="small">Sessions last 7: '+last7.length+'</div>';
  html += '<h4>Goals</h4>';
  if((data.goals||[]).length===0) html += '<div class="small">No goals</div>'; else html += '<ul>'+(data.goals.map(g=>`<li>${g}</li>`).join(''))+'</ul>';
  html += '<h4>XP History</h4>';
  if((data.xpHistory||[]).length===0) html += '<div class="small">No XP history</div>'; else html += '<ul>'+(data.xpHistory.map(x=>`<li>${x.date}: ${x.delta} XP</li>`).join(''))+'</ul>';
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
  localStorage.removeItem(key);
  renderAccountManager();
}

function toggleSuspend(key){
  const u = getUserByKey(key);
  if(!u) return;
  u.suspended = !u.suspended;
  saveUser(key,u);
  renderAccountManager();
}

function resetPassword(key){
  const u = getUserByKey(key);
  if(!u) return;
  const newPw = prompt('Enter new password for user (or leave blank to set default):','password123');
  u.password = newPw || 'password123';
  saveUser(key,u);
  alert('Password reset');
}

// Stats
function renderStatsOverview(){
  const container = document.getElementById('statsContainer');
  const users = getAllUsers().map(x=>x.user);
  const total = users.length;
  const active = users.filter(u=>{ if(!u.lastActive) return false; const d = new Date(u.lastActive); return (Date.now()-d.getTime()) < (1000*60*60*24*30); }).length;
  const totalStudy = users.reduce((s,u)=>s + (u.studyHours||0),0);
  const mostActive = users.slice().sort((a,b)=> (b.studyHours||0)-(a.studyHours||0)).slice(0,5);
  const domainCounts = {};
  users.forEach(u=> domainCounts[u.domain] = (domainCounts[u.domain]||0)+1);
  const topDomains = Object.entries(domainCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  let html = `<div class="row"><div class="col"><strong>Total users</strong><div class="small">${total}</div></div><div class="col"><strong>Active users (30d)</strong><div class="small">${active}</div></div><div class="col"><strong>Total study hours</strong><div class="small">${totalStudy}</div></div></div>`;
  html += '<h4>Most active students</h4><ul>' + (mostActive.length? mostActive.map(u=>`<li>${u.username} (${u.studyHours||0}h)</li>`).join('') : '<li class="small">No data</li>') + '</ul>';
  html += '<h4>Top domains</h4><ul>' + (topDomains.length? topDomains.map(d=>`<li>${d[0]} — ${d[1]} users</li>`).join('') : '<li class="small">No data</li>') + '</ul>';
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

function loadAdminTools(){
  document.getElementById('announceBtn').addEventListener('click', addAnnouncement);
  document.getElementById('challengeBtn').addEventListener('click', addChallenge);
  document.getElementById('achievementBtn').addEventListener('click', addAchievement);
  document.getElementById('xpRewardBtn').addEventListener('click', saveXpReward);
  document.getElementById('adminSecretBtn').addEventListener('click', ()=>{
    const v = document.getElementById('adminSecretInput').value.trim();
    if(!v) return;
    localStorage.setItem('adminSecret', v);
    alert('Admin secret updated');
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
window.renderAdminTools = renderAdminTools;
