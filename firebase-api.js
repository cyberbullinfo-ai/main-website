// Firebase integration helper for Cyberbull
// Replace the values below with your Firebase project configuration.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjayVTJYG02p8ZYpEfpvHf6bt0SXiV9Oc",
  authDomain: "cyberbull-officieel.firebaseapp.com",
  databaseURL: "https://cyberbull-crosschat-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "cyberbull-officieel",
  storageBucket: "cyberbull-officieel.firebasestorage.app",
  messagingSenderId: "1025456152028",
  appId: "1:1025456152028:web:10be7203f4fdf440520319",
  measurementId: "G-0PVLYJVZPH"
};

window.firebaseAPI = {
  isEnabled: false,
  db: null,
  auth: null,
  globalMessages: [],
  localMessagesBySchool: {},
  privateMessagesByConversation: {},
  onlineUsersCache: {},
  usersCache: [],
  friendListsByUser: {},
  incomingFriendRequests: {},
  conversationsByUser: {},
  subscribedFriendUsers: new Set(),
  subscribedConversations: new Set(),

  init() {
    const self = this;

    function continueInit() {
      if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.projectId) {
        console.warn('Firebase config not configured. Fill firebase-api.js with your project settings.');
        return;
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }

      self.db = firebase.firestore();
      try {
        self.db.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
      } catch (err) {
        console.warn('Could not apply Firestore settings', err);
      }
      self.auth = firebase.auth ? firebase.auth() : null;
      self.rtdb = firebase.database ? firebase.database() : null;
      self.isEnabled = true;

      self.subscribeGlobalMessages();
      self.subscribePresence();
      self.subscribeUsers();
    }

    if (typeof firebase === 'undefined') {
      // Try to load the compat CDN builds automatically so pages don't need to include them manually.
      const cdnBase = 'https://www.gstatic.com/firebasejs/9.22.2/';
      const scripts = [
        cdnBase + 'firebase-app-compat.js',
        cdnBase + 'firebase-auth-compat.js',
        cdnBase + 'firebase-firestore-compat.js',
        cdnBase + 'firebase-database-compat.js'
      ];
      let loaded = 0;
      scripts.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => {
          loaded++;
          if (loaded === scripts.length) continueInit();
        };
        s.onerror = () => {
          console.warn('Failed to load Firebase SDK script', src);
        };
        document.head.appendChild(s);
      });
      return;
    }

    continueInit();
  },

  getConversationId(userKey1, userKey2) {
    return [userKey1, userKey2].sort().join('_');
  },

  subscribeUserFriendData(userKey) {
    if (!this.isEnabled || !userKey || this.subscribedFriendUsers.has(userKey)) return;
    this.subscribedFriendUsers.add(userKey);

    this.db.collection('friendships').doc(userKey)
      .onSnapshot(doc => {
        this.friendListsByUser[userKey] = doc.exists ? doc.data().friends || [] : [];
      }, error => {
        console.error('Friend list snapshot failed', error);
      });

    this.db.collection('friendRequests')
      .where('toKey', '==', userKey)
      .onSnapshot(snapshot => {
        this.incomingFriendRequests[userKey] = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }, error => {
        console.error('Friend requests snapshot failed', error);
      });
  },

  getFriends(userKey) {
    return this.friendListsByUser[userKey] || [];
  },

  getIncomingFriendRequests(userKey) {
    return this.incomingFriendRequests[userKey] || [];
  },

  getConversations(userKey) {
    return this.conversationsByUser[userKey] || {};
  },

  subscribeUserConversations(userKey) {
    if (!this.isEnabled || !userKey || this.subscribedConversations.has(userKey)) return;
    this.subscribedConversations.add(userKey);

    this.db.collection('conversations').doc(userKey)
      .onSnapshot(doc => {
        this.conversationsByUser[userKey] = doc.exists ? doc.data().conversations || {} : {};
      }, error => {
        console.error('Conversations snapshot failed', error);
      });
  },

  async updateConversationIndex(userKey, otherKey, otherUserName, lastMessage) {
    if (!this.isEnabled || !userKey || !otherKey) return null;
    const updateData = {
      [`conversations.${otherKey}`]: {
        name: otherUserName,
        lastMessage: lastMessage.substring(0, 50),
        lastMessageTime: Date.now(),
        unread: firebase.firestore.FieldValue.increment(1)
      }
    };
    await this.db.collection('conversations').doc(userKey).set(updateData, { merge: true });
    return true;
  },

  async setConversationRead(userKey, otherKey) {
    if (!this.isEnabled || !userKey || !otherKey) return null;
    const updateData = {
      [`conversations.${otherKey}.unread`]: 0
    };
    await this.db.collection('conversations').doc(userKey).set(updateData, { merge: true });
    return true;
  },

  async sendFriendRequest(fromKey, fromName, toKey, toName) {
    if (!this.isEnabled || !fromKey || !toKey || fromKey === toKey) return null;
    const requestId = `${fromKey}_${toKey}`;
    const requestData = {
      fromKey,
      fromName,
      toKey,
      toName,
      timestamp: Date.now(),
      status: 'pending'
    };
    await this.db.collection('friendRequests').doc(requestId).set(requestData);
    return requestData;
  },

  async acceptFriendRequest(requestId, fromKey, toKey) {
    if (!this.isEnabled || !requestId || !fromKey || !toKey) return null;
    const friendRefA = this.db.collection('friendships').doc(fromKey);
    const friendRefB = this.db.collection('friendships').doc(toKey);

    await friendRefA.set({ friends: firebase.firestore.FieldValue.arrayUnion(toKey) }, { merge: true });
    await friendRefB.set({ friends: firebase.firestore.FieldValue.arrayUnion(fromKey) }, { merge: true });
    await this.db.collection('friendRequests').doc(requestId).delete();
    return true;
  },

  async rejectFriendRequest(requestId) {
    if (!this.isEnabled || !requestId) return null;
    await this.db.collection('friendRequests').doc(requestId).delete();
    return true;
  },

  async removeFriend(userKey, otherKey) {
    if (!this.isEnabled || !userKey || !otherKey) return null;
    await this.db.collection('friendships').doc(userKey).set({
      friends: firebase.firestore.FieldValue.arrayRemove(otherKey)
    }, { merge: true });
    await this.db.collection('friendships').doc(otherKey).set({
      friends: firebase.firestore.FieldValue.arrayRemove(userKey)
    }, { merge: true });
    return true;
  },

  subscribeGlobalMessages(hours = 24) {
    if (!this.isEnabled) return;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    this.db.collection('globalMessages')
      .where('timestamp', '>=', cutoff)
      .orderBy('timestamp')
      .onSnapshot(snapshot => {
        this.globalMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }, error => {
        console.error('Global chat snapshot failed', error);
      });
  },

  subscribeLocalMessages(schoolDomain, hours = 24) {
    if (!this.isEnabled || !schoolDomain) return;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    this.db.collection('localMessages')
      .where('schoolDomain', '==', schoolDomain)
      .where('timestamp', '>=', cutoff)
      .orderBy('timestamp')
      .onSnapshot(snapshot => {
        this.localMessagesBySchool[schoolDomain] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }, error => {
        console.error('Local chat snapshot failed', error);
      });
  },

  subscribePrivateMessages(userKey1, userKey2) {
    if (!this.isEnabled || !userKey1 || !userKey2) return;
    const conversationId = this.getConversationId(userKey1, userKey2);
    this.db.collection('privateChats')
      .where('conversationId', '==', conversationId)
      .orderBy('timestamp')
      .onSnapshot(snapshot => {
        this.privateMessagesByConversation[conversationId] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }, error => {
        console.error('Private chat snapshot failed', error);
      });
  },

  subscribePresence() {
    if (!this.isEnabled) return;
    const cutoff = Date.now() - 5 * 60 * 1000;
    this.db.collection('onlineUsers')
      .where('lastSeen', '>=', cutoff)
      .onSnapshot(snapshot => {
        this.onlineUsersCache = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          this.onlineUsersCache[data.userKey] = data;
        });
      }, error => {
        console.error('Presence snapshot failed', error);
      });
  },

  subscribeUsers() {
    if (!this.isEnabled) return;
    this.db.collection('users')
      .onSnapshot(snapshot => {
        this.usersCache = snapshot.docs.map(doc => ({ ...doc.data(), key: doc.id }));
        if (window.renderAccountManager) window.renderAccountManager();
        if (window.renderStatsOverview) window.renderStatsOverview();
      }, error => {
        console.error('Users snapshot failed', error);
      });
  },

  async sendGlobalMessage(userKey, username, message, avatar) {
    if (!this.isEnabled) return null;
    const messageData = {
      userKey,
      username,
      message: message.trim(),
      avatar,
      timestamp: Date.now(),
      chatType: 'global'
    };
    try {
      const docRef = await this.db.collection('globalMessages').add(messageData);
      return { id: docRef.id, ...messageData };
    } catch (error) {
      console.error('Firebase sendGlobalMessage failed', error);
      throw error;
    }
  },

  async sendLocalMessage(userKey, username, schoolDomain, message, avatar) {
    if (!this.isEnabled) return null;
    const messageData = {
      userKey,
      username,
      schoolDomain,
      message: message.trim(),
      avatar,
      timestamp: Date.now(),
      chatType: 'local'
    };
    try {
      await this.db.collection('localMessages').add(messageData);
      return messageData;
    } catch (error) {
      console.error('Firebase sendLocalMessage failed', error);
      throw error;
    }
  },

  async sendPrivateMessage(senderKey, senderName, recipientKey, recipientName, message) {
    if (!this.isEnabled) return null;
    const conversationId = this.getConversationId(senderKey, recipientKey);
    const messageData = {
      conversationId,
      senderKey,
      senderName,
      recipientKey,
      recipientName,
      message: message.trim(),
      timestamp: Date.now(),
      chatType: 'private'
    };
    try {
      await this.db.collection('privateChats').add(messageData);
      return messageData;
    } catch (error) {
      console.error('Firebase sendPrivateMessage failed', error);
      throw error;
    }
  },

  async setUserOnline(userKey, username, schoolDomain, avatar) {
    if (!this.isEnabled) return;
    try {
      await this.db.collection('onlineUsers').doc(userKey).set({
        userKey,
        username,
        schoolDomain,
        avatar,
        lastSeen: Date.now()
      });
      await this.saveUserProfile(userKey, {
        username,
        schoolDomain,
        avatar,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Firebase setUserOnline failed', error);
      throw error;
    }
  },

  getOnlineUsers() {
    return Object.values(this.onlineUsersCache || {});
  },

  getOnlineUsersInSchool(schoolDomain) {
    return Object.fromEntries(
      Object.entries(this.onlineUsersCache || {}).filter(([, user]) => user.schoolDomain === schoolDomain)
    );
  },

  async saveUserProfile(userKey, profile) {
    if (!this.isEnabled || !userKey) return;
    try {
      await this.db.collection('users').doc(userKey).set(profile, { merge: true });
    } catch (error) {
      console.error('Firebase saveUserProfile failed', error);
      throw error;
    }
  },

  async fetchUserProfile(userKey) {
    if (!this.isEnabled || !userKey) return null;
    const doc = await this.db.collection('users').doc(userKey).get();
    if (!doc.exists) return null;
    return { ...doc.data(), userKey: doc.id };
  },

  getUserProfile(userKey) {
    return (this.usersCache || []).find(u => u.userKey === userKey || u.key === userKey) || null;
  }
};

window.firebaseAPI.init();
