// ========== CHAT SYSTEM ==========
// Handles global, local (school), and private messaging

window.chatAPI = {
  // ===== MESSAGE MANAGEMENT =====
  
  /**
   * Send a local (school) message
   */
  sendLocalMessage(userKey, username, schoolDomain, message, avatar) {
    if (!message.trim() || !schoolDomain) return null;

    const messageObj = {
      id: `msg-${Date.now()}-${Math.random()}`,
      userKey,
      username,
      schoolDomain,
      message: message.trim(),
      avatar,
      timestamp: Date.now(),
      chatType: 'local'
    };

    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.sendLocalMessage(userKey, username, schoolDomain, message, avatar)
        .catch(console.error);
      return messageObj;
    }

    const storageKey = `localChat_${schoolDomain}`;
    let localChat = JSON.parse(localStorage.getItem(storageKey) || '[]');
    localChat.push(messageObj);

    if (localChat.length > 500) {
      localChat = localChat.slice(-500);
    }

    localStorage.setItem(storageKey, JSON.stringify(localChat));
    return messageObj;
  },

  /**
   * Get local messages for a school domain
   */
  getLocalMessages(schoolDomain, hoursBack = 24) {
    if (!schoolDomain) return [];

    if (window.firebaseAPI?.isEnabled) {
      const cached = window.firebaseAPI.localMessagesBySchool[schoolDomain] || [];
      const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
      return cached.filter(msg => msg.timestamp >= cutoffTime);
    }

    const storageKey = `localChat_${schoolDomain}`;
    const localChat = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    return localChat.filter(msg => msg.timestamp >= cutoffTime);
  },

  /**
   * Send a private message between two users
   */
  sendPrivateMessage(senderKey, senderName, recipientKey, recipientName, message) {
    if (!message.trim() || !recipientKey) return null;

    const messageObj = {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderKey,
      senderName,
      recipientKey,
      recipientName,
      message: message.trim(),
      timestamp: Date.now(),
      read: false,
      chatType: 'private'
    };

    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.sendPrivateMessage(senderKey, senderName, recipientKey, recipientName, message)
        .catch(console.error);
      window.firebaseAPI.updateConversationIndex(senderKey, recipientKey, recipientName, message)
        .catch(console.error);
      window.firebaseAPI.updateConversationIndex(recipientKey, senderKey, senderName, message)
        .catch(console.error);
      return messageObj;
    }

    const users = [senderKey, recipientKey].sort();
    const conversationKey = `privateChat_${users[0]}_${users[1]}`;

    let privateChat = JSON.parse(localStorage.getItem(conversationKey) || '[]');
    privateChat.push(messageObj);

    localStorage.setItem(conversationKey, JSON.stringify(privateChat));

    this._updateConversationIndex(senderKey, recipientKey, recipientName, message);
    this._updateConversationIndex(recipientKey, senderKey, senderName, message);

    return messageObj;
  },

  /**
   * Get private messages between two users
   */
  getPrivateMessages(userKey1, userKey2) {
    if (window.firebaseAPI?.isEnabled) {
      const conversationId = window.firebaseAPI.getConversationId(userKey1, userKey2);
      return window.firebaseAPI.privateMessagesByConversation[conversationId] || [];
    }

    const users = [userKey1, userKey2].sort();
    const conversationKey = `privateChat_${users[0]}_${users[1]}`;
    return JSON.parse(localStorage.getItem(conversationKey) || '[]');
  },

  /**
   * Get all conversations for a user
   */
  getUserConversations(userKey) {
    if (window.firebaseAPI?.isEnabled) {
      return window.firebaseAPI.getConversations(userKey) || {};
    }
    const conversationsKey = `conversations_${userKey}`;
    return JSON.parse(localStorage.getItem(conversationsKey) || '{}');
  },

  sendGlobalMessage(userKey, username, message, avatar) {
    if (!message.trim() || !userKey) return null;

    const messageObj = {
      id: `msg-${Date.now()}-${Math.random()}`,
      userKey,
      username,
      message: message.trim(),
      avatar,
      timestamp: Date.now(),
      chatType: 'global'
    };

    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.sendGlobalMessage(userKey, username, message, avatar)
        .catch(console.error);
      return messageObj;
    }

    const storageKey = 'globalChat';
    let globalChat = JSON.parse(localStorage.getItem(storageKey) || '[]');
    globalChat.push(messageObj);

    if (globalChat.length > 1000) {
      globalChat = globalChat.slice(-1000);
    }

    localStorage.setItem(storageKey, JSON.stringify(globalChat));
    return messageObj;
  },

  getGlobalMessages(hoursBack = 24) {
    if (window.firebaseAPI?.isEnabled) {
      const cached = window.firebaseAPI.globalMessages || [];
      const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
      return cached.filter(msg => msg.timestamp >= cutoffTime);
    }

    const storageKey = 'globalChat';
    const globalChat = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    return globalChat.filter(msg => msg.timestamp >= cutoffTime);
  },

  /**
   * Update conversation index for quick access
   */
  _updateConversationIndex(userKey, otherUserKey, otherUserName, lastMessage) {
    const conversationsKey = `conversations_${userKey}`;
    let conversations = JSON.parse(localStorage.getItem(conversationsKey) || '{}');
    
    conversations[otherUserKey] = {
      name: otherUserName,
      lastMessage: lastMessage.substring(0, 50),
      lastMessageTime: Date.now(),
      unread: (conversations[otherUserKey]?.unread || 0) + 1
    };
    
    localStorage.setItem(conversationsKey, JSON.stringify(conversations));
  },

  /**
   * Mark messages as read in a conversation
   */
  markConversationAsRead(userKey, otherUserKey) {
    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.setConversationRead(userKey, otherUserKey)
        .catch(console.error);
      return;
    }

    const conversationsKey = `conversations_${userKey}`;
    let conversations = JSON.parse(localStorage.getItem(conversationsKey) || '{}');
    
    if (conversations[otherUserKey]) {
      conversations[otherUserKey].unread = 0;
      localStorage.setItem(conversationsKey, JSON.stringify(conversations));
    }
  },

  /**
   * Get total unread message count for user
   */
  getUnreadCount(userKey) {
    const conversations = this.getUserConversations(userKey);
    return Object.values(conversations).reduce((sum, conv) => sum + (conv.unread || 0), 0);
  },

  // ===== USER PRESENCE =====

  /**
   * Set user online status
   */
  setUserOnline(userKey, username, schoolDomain, avatar) {
    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.setUserOnline(userKey, username, schoolDomain, avatar)
        .catch(console.error);
      window.firebaseAPI.subscribeUserFriendData(userKey);
      return;
    }

    const presenceKey = 'onlineUsers';
    let onlineUsers = JSON.parse(localStorage.getItem(presenceKey) || '{}');

    onlineUsers[userKey] = {
      username,
      schoolDomain,
      avatar,
      lastSeen: Date.now()
    };

    localStorage.setItem(presenceKey, JSON.stringify(onlineUsers));
  },

  /**
   * Get online users (within last 5 minutes)
   */
  getOnlineUsers() {
    if (window.firebaseAPI?.isEnabled) {
      return window.firebaseAPI.getOnlineUsers();
    }

    const presenceKey = 'onlineUsers';
    let onlineUsers = JSON.parse(localStorage.getItem(presenceKey) || '{}');
    const cutoffTime = Date.now() - (5 * 60 * 1000);

    // Filter out stale entries
    Object.keys(onlineUsers).forEach(key => {
      if (onlineUsers[key].lastSeen < cutoffTime) {
        delete onlineUsers[key];
      }
    });

    localStorage.setItem(presenceKey, JSON.stringify(onlineUsers));
    return onlineUsers;
  },

  /**
   * Get online users in a school domain
   */
  getOnlineUsersInSchool(schoolDomain) {
    if (window.firebaseAPI?.isEnabled) {
      return window.firebaseAPI.getOnlineUsersInSchool(schoolDomain);
    }

    const onlineUsers = this.getOnlineUsers();
    return Object.fromEntries(
      Object.entries(onlineUsers).filter(([_, user]) => user.schoolDomain === schoolDomain)
    );
  },

  /**
   * Get list of searchable users (all users in system)
   */
  getAllUsers() {
    if (window.firebaseAPI?.isEnabled) {
      return (window.firebaseAPI.usersCache || []).map(user => ({
        key: user.userKey || user.key,
        username: user.username,
        schoolDomain: user.domain || user.schoolDomain || '',
        avatar: user.avatar || user.emojiPicture || '😊'
      }));
    }

    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('user_')) {
        const user = getUserByKey(key);
        if (user) {
          users.push({
            key,
            username: user.username,
            schoolDomain: user.domain || user.schoolDomain || '',
            avatar: user.avatar || user.emojiPicture || '😊'
          });
        }
      }
    }
    return users;
  },

  getFriends(userKey) {
    if (window.firebaseAPI?.isEnabled) {
      return window.firebaseAPI.getFriends(userKey) || [];
    }

    return JSON.parse(localStorage.getItem(`friends_${userKey}`) || '[]');
  },

  isFriend(userKey, otherKey) {
    if (!userKey || !otherKey) return false;
    const friends = this.getFriends(userKey);
    return friends.includes(otherKey);
  },

  getIncomingFriendRequests(userKey) {
    if (window.firebaseAPI?.isEnabled) {
      return window.firebaseAPI.getIncomingFriendRequests(userKey) || [];
    }

    return JSON.parse(localStorage.getItem(`friendRequests_${userKey}`) || '[]');
  },

  sendFriendRequest(fromKey, fromName, toKey, toName) {
    if (!fromKey || !toKey || fromKey === toKey) return null;

    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.sendFriendRequest(fromKey, fromName, toKey, toName)
        .catch(console.error);
      return { fromKey, fromName, toKey, toName, status: 'pending' };
    }

    const key = `friendRequests_${toKey}`;
    let requests = JSON.parse(localStorage.getItem(key) || '[]');
    const exists = requests.some(r => r.fromKey === fromKey);
    if (!exists) {
      requests.push({ fromKey, fromName, toKey, toName, timestamp: Date.now(), status: 'pending' });
      localStorage.setItem(key, JSON.stringify(requests));
    }
    return { fromKey, fromName, toKey, toName, status: 'pending' };
  },

  acceptFriendRequest(userKey, requestId, fromKey, fromName) {
    if (!userKey || !fromKey) return false;
    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.acceptFriendRequest(requestId, fromKey, userKey)
        .catch(console.error);
      return true;
    }

    const requestKey = `friendRequests_${userKey}`;
    let requests = JSON.parse(localStorage.getItem(requestKey) || '[]');
    requests = requests.filter(req => req.fromKey !== fromKey);
    localStorage.setItem(requestKey, JSON.stringify(requests));

    const myFriendsKey = `friends_${userKey}`;
    const theirFriendsKey = `friends_${fromKey}`;
    const myFriends = JSON.parse(localStorage.getItem(myFriendsKey) || '[]');
    const theirFriends = JSON.parse(localStorage.getItem(theirFriendsKey) || '[]');

    if (!myFriends.includes(fromKey)) myFriends.push(fromKey);
    if (!theirFriends.includes(userKey)) theirFriends.push(userKey);
    localStorage.setItem(myFriendsKey, JSON.stringify(myFriends));
    localStorage.setItem(theirFriendsKey, JSON.stringify(theirFriends));
    return true;
  },

  rejectFriendRequest(userKey, requestId, fromKey) {
    if (!userKey || !fromKey) return false;
    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.rejectFriendRequest(requestId)
        .catch(console.error);
      return true;
    }

    const requestKey = `friendRequests_${userKey}`;
    let requests = JSON.parse(localStorage.getItem(requestKey) || '[]');
    requests = requests.filter(req => req.fromKey !== fromKey);
    localStorage.setItem(requestKey, JSON.stringify(requests));
    return true;
  },

  removeFriend(userKey, friendKey) {
    if (!userKey || !friendKey) return false;
    if (window.firebaseAPI?.isEnabled) {
      window.firebaseAPI.removeFriend(userKey, friendKey)
        .catch(console.error);
      return true;
    }

    const friendListKey = `friends_${userKey}`;
    let friends = JSON.parse(localStorage.getItem(friendListKey) || '[]').filter(k => k !== friendKey);
    localStorage.setItem(friendListKey, JSON.stringify(friends));
    return true;
  },

  // ===== MESSAGE DELETION =====

  /**
   * Delete a message (only sender can delete) - GLOBAL CHAT DISABLED
   */
  deleteGlobalMessage(messageId, userKey) {
    if (window.firebaseAPI?.isEnabled && messageId) {
      const docRef = window.firebaseAPI.db.collection('globalMessages').doc(messageId);
      docRef.get().then(doc => {
        if (doc.exists && doc.data().userKey === userKey) {
          docRef.delete().catch(console.error);
        }
      }).catch(console.error);
      return true;
    }

    const storageKey = 'globalChat';
    let globalChat = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const msgIndex = globalChat.findIndex(m => m.id === messageId && m.userKey === userKey);
    if (msgIndex !== -1) {
      globalChat.splice(msgIndex, 1);
      localStorage.setItem(storageKey, JSON.stringify(globalChat));
      return true;
    }
    return false;
  },

  /**
   * Delete a local message (only sender can delete)
   */
  deleteLocalMessage(messageId, userKey, schoolDomain) {
    const storageKey = `localChat_${schoolDomain}`;
    let localChat = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const msgIndex = localChat.findIndex(m => m.id === messageId && m.userKey === userKey);
    
    if (msgIndex !== -1) {
      localChat.splice(msgIndex, 1);
      localStorage.setItem(storageKey, JSON.stringify(localChat));
      return true;
    }
    return false;
  },

  /**
   * Delete a private message (only sender can delete)
   */
  deletePrivateMessage(messageId, senderKey, userKey1, userKey2) {
    const users = [userKey1, userKey2].sort();
    const conversationKey = `privateChat_${users[0]}_${users[1]}`;
    let privateChat = JSON.parse(localStorage.getItem(conversationKey) || '[]');
    const msgIndex = privateChat.findIndex(m => m.id === messageId && m.senderKey === senderKey);
    
    if (msgIndex !== -1) {
      privateChat.splice(msgIndex, 1);
      localStorage.setItem(conversationKey, JSON.stringify(privateChat));
      return true;
    }
    return false;
  },

  // ===== MODERATION =====

  /**
   * Block a user (won't see their messages)
   */
  blockUser(userKey, blockedUserKey) {
    const blockedKey = `blocked_${userKey}`;
    let blocked = JSON.parse(localStorage.getItem(blockedKey) || '[]');
    if (!blocked.includes(blockedUserKey)) {
      blocked.push(blockedUserKey);
      localStorage.setItem(blockedKey, JSON.stringify(blocked));
    }
  },

  /**
   * Unblock a user
   */
  unblockUser(userKey, blockedUserKey) {
    const blockedKey = `blocked_${userKey}`;
    let blocked = JSON.parse(localStorage.getItem(blockedKey) || '[]');
    blocked = blocked.filter(k => k !== blockedUserKey);
    localStorage.setItem(blockedKey, JSON.stringify(blocked));
  },

  /**
   * Get blocked users for a user
   */
  getBlockedUsers(userKey) {
    const blockedKey = `blocked_${userKey}`;
    return JSON.parse(localStorage.getItem(blockedKey) || '[]');
  },

  /**
   * Check if user is blocked
   */
  isUserBlocked(userKey, checkUserKey) {
    const blocked = this.getBlockedUsers(userKey);
    return blocked.includes(checkUserKey);
  },

  /**
   * Filter messages by blocked users
   */
  filterBlockedMessages(messages, userKey) {
    const blocked = this.getBlockedUsers(userKey);
    return messages.filter(msg => !blocked.includes(msg.userKey || msg.senderKey));
  },

  // ===== USER COSMETICS =====

  /**
   * Get user's chat cosmetics (emoji picture, name color)
   */
  getUserCosmetics(userKey) {
    if (window.firebaseAPI?.isEnabled) {
      const profile = window.firebaseAPI.getUserProfile(userKey);
      if (profile) {
        return {
          emojiPicture: profile.emojiPicture || profile.avatar || '😊',
          nameColor: profile.nameColor || '#ffffff',
          customEmoji: profile.customEmoji || null
        };
      }
    }

    const user = JSON.parse(localStorage.getItem(`user_${userKey}`) || '{}');
    return {
      emojiPicture: user.emojiPicture || user.avatar || '😊',
      nameColor: user.nameColor || '#ffffff',
      customEmoji: user.customEmoji || null
    };
  },

  /**
   * Set user's chat cosmetics
   */
  setUserCosmetics(userKey, emojiPicture, nameColor) {
    const userStorageKey = `user_${userKey}`;
    const user = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
    
    if (emojiPicture) user.emojiPicture = emojiPicture;
    if (nameColor) user.nameColor = nameColor;
    
    localStorage.setItem(userStorageKey, JSON.stringify(user));
    if (window.firebaseAPI?.isEnabled && window.firebaseAPI.saveUserProfile) {
      window.firebaseAPI.saveUserProfile(userKey, user).catch(err => {
        console.error('Failed to save user cosmetics to Firebase', err);
      });
    }
  },

  /**
   * Get all users with their cosmetics
   */
  getAllUsersWithCosmetics() {
    const users = this.getAllUsers();
    return users.map(u => ({
      ...u,
      cosmetics: this.getUserCosmetics(u.key)
    }));
  }
};
