// Basic shared helpers: escaping and lightweight non-blocking UI helpers
window.escapeHtml = function (input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.escapeAttr = function(input) {
  // safe for single-quoted attribute insertion
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

window.showAlert = function(message, timeout = 2200) {
  try {
    const id = 'cb-alert-overlay';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.top = '10%';
      el.style.transform = 'translateX(-50%)';
      el.style.zIndex = 99999;
      el.style.background = 'rgba(0,0,0,0.85)';
      el.style.color = '#fff';
      el.style.padding = '10px 16px';
      el.style.borderRadius = '8px';
      el.style.fontSize = '14px';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.display = 'block';
    if (timeout > 0) setTimeout(() => { el.style.display = 'none'; }, timeout);
  } catch (e) { console.warn('showAlert failed', e); }
};

window.showPrompt = function(message, defaultValue = '') {
  return new Promise((resolve) => {
    try {
      const wrapperId = 'cb-prompt-wrapper';
      let wrapper = document.getElementById(wrapperId);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.style.position = 'fixed';
        wrapper.style.left = 0;
        wrapper.style.top = 0;
        wrapper.style.right = 0;
        wrapper.style.bottom = 0;
        wrapper.style.background = 'rgba(0,0,0,0.5)';
        wrapper.style.zIndex = 100000;
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        const panel = document.createElement('div');
        panel.style.background = '#fff';
        panel.style.padding = '16px';
        panel.style.borderRadius = '8px';
        panel.style.width = '320px';
        panel.style.maxWidth = '90%';
        panel.id = wrapperId + '-panel';
        wrapper.appendChild(panel);
        document.body.appendChild(wrapper);
      }
      const panel = document.getElementById(wrapperId + '-panel');
      panel.innerHTML = '';
      const label = document.createElement('div'); label.textContent = message; label.style.marginBottom = '8px'; panel.appendChild(label);
      const input = document.createElement('input'); input.type = 'text'; input.value = defaultValue || ''; input.style.width = '100%'; input.style.marginBottom = '8px'; panel.appendChild(input);
      const btnRow = document.createElement('div'); btnRow.style.display = 'flex'; btnRow.style.justifyContent = 'flex-end'; btnRow.style.gap = '8px';
      const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel';
      const okBtn = document.createElement('button'); okBtn.textContent = 'OK'; okBtn.className = 'btn primary';
      btnRow.appendChild(cancelBtn); btnRow.appendChild(okBtn); panel.appendChild(btnRow);
      input.focus();
      function cleanup(val) { document.getElementById(wrapperId).style.display = 'none'; resolve(val); }
      cancelBtn.addEventListener('click', () => cleanup(null));
      okBtn.addEventListener('click', () => cleanup(input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cleanup(input.value); if (e.key === 'Escape') cleanup(null); });
      document.getElementById(wrapperId).style.display = 'flex';
    } catch (e) { console.warn('showPrompt failed', e); resolve(null); }
  });
};

window.globalAuth = (function() {
  function clearAuthState() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('user_') || key === 'currentUser' || key === 'currentUserKey' || key === 'currentSchool' || key === 'isAdmin' || key === 'clearUserAccountsDone')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  function getUserFromServerSync(userKey) {
    if (!userKey || typeof XMLHttpRequest !== 'function') return null;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/getUser/${encodeURIComponent(userKey)}`, false);
      xhr.timeout = 3000;
      xhr.send(null);
      if (xhr.status === 200) {
        const body = xhr.responseText;
        if (body) {
          return JSON.parse(body);
        }
      }
    } catch (error) {
      console.warn('Sync auth server check failed', error);
    }
    return null;
  }

  // Non-blocking alternative to fetch user data from server
  async function getUserFromServerAsync(userKey) {
    if (!userKey || !window.fetch) return null;
    try {
      const resp = await fetch(`/api/getUser/${encodeURIComponent(userKey)}`);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      console.warn('Async auth server check failed', err);
      return null;
    }
  }

  function requireAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const currentUserKey = localStorage.getItem('currentUserKey');
    if (!currentUser || !currentUserKey) {
      clearAuthState();
      window.location.href = 'cyberbull-landing.html';
      return false;
    }

    const serverUser = getUserFromServerSync(currentUserKey);
    if (!serverUser) {
      clearAuthState();
      window.location.href = 'cyberbull-landing.html';
      return false;
    }

    localStorage.setItem(currentUserKey, JSON.stringify(serverUser));
    return true;
  }

  function requireAdminAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const currentUserKey = localStorage.getItem('currentUserKey');
    if (!currentUser || !currentUserKey) {
      clearAuthState();
      window.location.href = 'cyberbull-landing.html';
      return false;
    }

    const serverUser = getUserFromServerSync(currentUserKey);
    if (!serverUser || !serverUser.isAdmin) {
      clearAuthState();
      window.location.href = 'cyberbull-landing.html';
      return false;
    }

    localStorage.setItem(currentUserKey, JSON.stringify(serverUser));
    localStorage.setItem('isAdmin', 'true');
    return true;
  }

  function getUserData(userKey) {
    if (!userKey) return null;
    if (window.firebaseAPI?.isEnabled) {
      const profile = window.firebaseAPI.getUserProfile(userKey);
      if (profile) return profile;
    }
    const serverUser = getUserFromServerSync(userKey);
    if (serverUser) {
      return serverUser;
    }
    return null;
  }

  async function saveUserData(userKey, userObj) {
    if (!userKey || !userObj) return false;
    try {
      if (window.fetch) {
        const response = await fetch('/api/saveUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userKey, userObj })
        });
        if (!response.ok) {
          console.warn('Global saveUser API returned failure', response.status);
          return false;
        }
      }
      if (window.firebaseAPI?.isEnabled && window.firebaseAPI.saveUserProfile) {
        await window.firebaseAPI.saveUserProfile(userKey, userObj);
      }
      return true;
    } catch (error) {
      console.error('saveUserData failed', error);
      return false;
    }
  }

  function requireGuest() {
    const currentUser = localStorage.getItem('currentUser');
    const currentUserKey = localStorage.getItem('currentUserKey');
    if (currentUser && currentUserKey) {
      const serverUser = getUserFromServerSync(currentUserKey);
      if (serverUser) {
        window.location.href = 'cyberbull-student.html';
        return false;
      }
      clearAuthState();
    }
    return true;
  }

  return {
    requireAuth,
    requireAdminAuth,
    requireGuest,
    getUserData,
    saveUserData
  };
})();
