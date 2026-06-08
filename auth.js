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

// API path helper: if site is served under a subpath (e.g. /main-website/),
// prefix API calls with that subpath so relative absolute paths resolve correctly.
// Prefer centralized config if present
if (!window.apiUrl) {
  window.apiUrl = function(path) {
    if (!path) return path;
    if (!path.startsWith('/')) path = '/' + path;
    if (window.API_ORIGIN && typeof window.API_ORIGIN === 'string' && window.API_ORIGIN.trim()) {
      const base = window.API_ORIGIN.replace(/\/$/, '');
      return base + path;
    }
    const p = (window.location && window.location.pathname) || '';
    const subpath = (p.indexOf('/main-website/') !== -1 || p === '/main-website') ? '/main-website' : '';
    return (subpath || '') + path;
  };
}

window.globalAuth = (function() {
  let lastGlobalAuthError = null;

  function setLastGlobalAuthError(err) {
    lastGlobalAuthError = err ? String(err) : null;
  }

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
      xhr.open('GET', apiUrl(`/api/getUser/${encodeURIComponent(userKey)}`), false);
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
      const resp = await fetch(apiUrl(`/api/getUser/${encodeURIComponent(userKey)}`));
      if (!resp.ok) return null;
      setLastGlobalAuthError(null);
      return await resp.json();
    } catch (err) {
      console.warn('Async auth server check failed', err);
      setLastGlobalAuthError('Backend unavailable');
      return null;
    }
  }

  async function getFirebaseUserAsync(userKey) {
    if (!userKey || !window.firebaseAPI?.isEnabled || !window.firebaseAPI.fetchUserProfile) return null;
    try {
      const profile = await window.firebaseAPI.fetchUserProfile(userKey);
      if (profile) setLastGlobalAuthError(null);
      return profile;
    } catch (err) {
      console.warn('Async Firebase auth check failed', err);
      setLastGlobalAuthError('Firebase unavailable');
      return null;
    }
  }

  async function getGlobalUserAsync(userKey) {
    if (!userKey) return null;
    // Prefer Firebase when available (static hosts benefit from Firestore)
    if (window.firebaseAPI?.isEnabled) {
      const fb = await getFirebaseUserAsync(userKey);
      if (fb) return fb;
    }
    const serverUser = await getUserFromServerAsync(userKey);
    if (serverUser) return serverUser;
    // fallback to firebase again in case server failed but firebase became available
    if (window.firebaseAPI?.isEnabled) return await getFirebaseUserAsync(userKey);
    return null;
  }

  async function checkGlobalPasswordAsync(userKey, password) {
    if (!userKey || typeof password === 'undefined') return false;
    // Prefer Firebase when available
    if (window.firebaseAPI?.isEnabled) {
      const firebaseUser = await getFirebaseUserAsync(userKey);
      if (firebaseUser) return firebaseUser.password === password;
    }

    if (window.fetch) {
      try {
        const verifyResp = await fetch(apiUrl('/api/checkPassword'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userKey, password })
        });
        if (verifyResp.ok) {
          setLastGlobalAuthError(null);
          return true;
        }
        if (verifyResp.status === 401) return false;
        if (verifyResp.status === 404) return false;
      } catch (err) {
        console.warn('Global password check failed via server', err);
        setLastGlobalAuthError('Backend unavailable');
      }
    }

    return false;
  }

  async function saveGlobalUserAsync(userKey, userObj) {
    if (!userKey || !userObj) return false;
    let serverSaved = false;
    let lastServerStatus = null;
    // Prefer Firebase first for static/public hosting
    if (window.firebaseAPI?.isEnabled && window.firebaseAPI.saveUserProfile) {
      try {
        await window.firebaseAPI.saveUserProfile(userKey, userObj);
        setLastGlobalAuthError(null);
        return true;
      } catch (err) {
        console.warn('Firebase saveUserProfile failed', err);
        setLastGlobalAuthError('Firebase unavailable');
      }
    }

    if (window.fetch) {
      try {
        const response = await fetch(apiUrl('/api/saveUser'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userKey, userObj })
        });
        lastServerStatus = response.status;
        if (response.ok) {
          setLastGlobalAuthError(null);
          // Also write to Firebase async if available
          if (window.firebaseAPI?.isEnabled && window.firebaseAPI.saveUserProfile) {
            window.firebaseAPI.saveUserProfile(userKey, userObj).catch(err => console.warn('Firebase saveUserProfile fallback failed after server save', err));
          }
          return true;
        }
      } catch (error) {
        console.warn('Global saveUser API failed', error);
        setLastGlobalAuthError('Backend unavailable');
      }
    }

    return false;
  }

  function requireAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const currentUserKey = localStorage.getItem('currentUserKey');
    if (!currentUser || !currentUserKey) {
      clearAuthState();
      window.location.href = 'cyberbull-landing.html';
      return false;
    }
    // Prefer Firebase when enabled (avoid unnecessary sync XHR on static hosts)
    if (window.firebaseAPI?.isEnabled) {
      try {
        const profile = window.firebaseAPI.getUserProfile(currentUserKey);
        if (profile) {
          localStorage.setItem(currentUserKey, JSON.stringify(profile));
          return true;
        }
      } catch (e) {
        console.warn('Firebase profile check failed', e);
      }
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
    if (serverUser && serverUser.isAdmin) {
      localStorage.setItem(currentUserKey, JSON.stringify(serverUser));
      localStorage.setItem('isAdmin', 'true');
      return true;
    }

    if (window.firebaseAPI?.isEnabled) {
      const firebaseProfile = window.firebaseAPI.getUserProfile(currentUserKey);
      if (firebaseProfile && firebaseProfile.isAdmin) {
        localStorage.setItem('isAdmin', 'true');
        return true;
      }
      if (localStorage.getItem('isAdmin') === 'true') {
        return true;
      }
    }

    clearAuthState();
    window.location.href = 'cyberbull-landing.html';
    return false;
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
    return await saveGlobalUserAsync(userKey, userObj);
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

  function getLastAuthError() {
    return lastGlobalAuthError;
  }

  return {
    requireAuth,
    requireAdminAuth,
    requireGuest,
    getUserData,
    saveUserData,
    getGlobalUserAsync,
    checkGlobalPasswordAsync,
    saveGlobalUserAsync
  };
})();
