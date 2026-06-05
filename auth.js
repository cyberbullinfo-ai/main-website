window.globalAuth = (function() {
  function requireAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const currentUserKey = localStorage.getItem('currentUserKey');
    if (!currentUser || !currentUserKey) {
      window.location.href = 'cyberbull-landing.html';
      return false;
    }
    return true;
  }

  function requireAdminAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const currentUserKey = localStorage.getItem('currentUserKey');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!currentUser || !currentUserKey || !isAdmin) {
      window.location.href = 'cyberbull-landing.html';
      return false;
    }
    return true;
  }

  function getUserData(userKey) {
    if (!userKey) return null;
    if (window.firebaseAPI?.isEnabled) {
      const profile = window.firebaseAPI.getUserProfile(userKey);
      if (profile) return profile;
    }
    const raw = localStorage.getItem(userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function saveUserData(userKey, userObj) {
    if (!userKey || !userObj) return false;
    try {
      localStorage.setItem(userKey, JSON.stringify(userObj));
      if (window.firebaseAPI?.isEnabled && window.firebaseAPI.saveUserProfile) {
        await window.firebaseAPI.saveUserProfile(userKey, userObj);
      }
      if (window.fetch) {
        try {
          await fetch('/api/saveUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey, userObj })
          });
        } catch (err) {
          console.warn('Global saveUser API failed', err);
        }
      }
      return true;
    } catch (error) {
      console.error('saveUserData failed', error);
      return false;
    }
  }

  function requireGuest() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      window.location.href = 'cyberbull-student.html';
      return false;
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
