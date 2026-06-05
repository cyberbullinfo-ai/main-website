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
