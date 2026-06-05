// ============================================
// PROGRESSION SYSTEM - Core Data & Functions
// ============================================

// ============ LEVELING SYSTEM ============
const LEVEL_CONFIG = {
  xpPerLevel: 100,
  bonusXpPerLevel: 10, // Increases by 10 per level
  levels: {
    1: { title: 'Novice', badge: '🎓', unlocks: [] },
    5: { title: 'Scholar', badge: '📚', unlocks: ['theme_dark', 'profile_border_gold'] },
    10: { title: 'Master', badge: '⭐', unlocks: ['theme_neon', 'profile_title'] },
    15: { title: 'Legend', badge: '👑', unlocks: ['theme_custom', 'exclusive_pet_dragon'] },
    20: { title: 'Sage', badge: '🔥', unlocks: ['theme_hologram', 'exclusive_pet_phoenix'] }
  }
};

function getXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    const xpNeeded = LEVEL_CONFIG.xpPerLevel + (i - 1) * LEVEL_CONFIG.bonusXpPerLevel;
    total += xpNeeded;
  }
  return total;
}

function getCurrentLevel(xp) {
  let level = 1;
  while (getXpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

function getXpProgressInLevel(xp) {
  const currentLevel = getCurrentLevel(xp);
  const xpForCurrentLevel = getXpForLevel(currentLevel);
  const xpForNextLevel = getXpForLevel(currentLevel + 1);
  const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
  return { current: xp - xpForCurrentLevel, needed: xpForNextLevel - xpForCurrentLevel, percent: progress };
}

function getUserByKey(userKey) {
  if (!userKey || typeof XMLHttpRequest !== 'function') return null;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/getUser/${encodeURIComponent(userKey)}`, false);
    xhr.timeout = 3000;
    xhr.send(null);
    if (xhr.status === 200 && xhr.responseText) {
      return JSON.parse(xhr.responseText);
    }
  } catch (err) {
    console.warn('Failed to fetch user data globally for key', userKey, err);
  }
  return null;
}

function saveUser(userKey, user) {
  if (!userKey || !user || typeof XMLHttpRequest !== 'function') return;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/saveUser', false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ userKey, userObj: user }));
    if (xhr.status !== 200 && xhr.status !== 204) {
      console.warn('Global saveUser API returned failure', xhr.status, xhr.responseText);
    }
  } catch (err) {
    console.warn('Failed to save user data globally for key', userKey, err);
  }
}

// ============ STUDY ROOMS ============
const ROOM_THEMES = ['light', 'dark', 'neon', 'nature', 'cyber', 'minimalist', 'cozy'];
const FURNITURE_ITEMS = [
  { id: 'desk_basic', name: 'Basic Desk', cost: 50, category: 'furniture' },
  { id: 'desk_gaming', name: 'Gaming Desk', cost: 200, category: 'furniture' },
  { id: 'lamp_basic', name: 'Table Lamp', cost: 30, category: 'lighting' },
  { id: 'lamp_smart', name: 'Smart Lamp', cost: 150, category: 'lighting' },
  { id: 'chair_basic', name: 'Basic Chair', cost: 100, category: 'furniture' },
  { id: 'chair_gaming', name: 'Gaming Chair', cost: 400, category: 'furniture' },
  { id: 'bookshelf', name: 'Bookshelf', cost: 120, category: 'furniture' },
  { id: 'poster_motivational', name: 'Motivational Poster', cost: 25, category: 'decoration' },
  { id: 'poster_anime', name: 'Anime Poster', cost: 40, category: 'decoration' },
  { id: 'plant', name: 'Potted Plant', cost: 35, category: 'decoration' },
  { id: 'neon_sign', name: 'Neon Sign', cost: 150, category: 'decoration' },
  { id: 'pet_cat', name: 'Virtual Cat', cost: 500, category: 'pet' },
  { id: 'pet_dog', name: 'Virtual Dog', cost: 500, category: 'pet' },
  { id: 'pet_dragon', name: 'Dragon Pet (Level 15+)', cost: 2000, category: 'pet' }
];

// ============ CHAT COSMETICS ============
const CHAT_COSMETICS = {
  creator: 'brasseurkulksa from sml.smartschool.be',
  freeToUse: true,
  
  emoji_pictures: [
    // ===== COMMON - 50 COINS =====
    { tier: 'common', cost: 50, id: 'emoji_smiley', name: '🙂 Standard Smiley', emoji: '🙂', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_grin', name: '😀 Grinning Face', emoji: '😀', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_smile', name: '😃 Smiling Face', emoji: '😃', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_laugh', name: '😄 Laughing Face', emoji: '😄', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_beaming', name: '😁 Beaming Face', emoji: '😁', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_sweat_smile', name: '😆 Smiling Face with Sweat', emoji: '😆', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_joy_sweat', name: '😅 Grinning with Sweat', emoji: '😅', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_tear', name: '😂 Tears of Joy', emoji: '😂', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_rofl', name: '🤣 Rolling on Floor Laughing', emoji: '🤣', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_relaxed', name: '☺️ Smiling Face', emoji: '☺️', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_innocent', name: '😇 Smiling Angel', emoji: '😇', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_upside', name: '🙃 Upside Down Face', emoji: '🙃', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_wink', name: '😉 Winking Face', emoji: '😉', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_blissful', name: '😊 Blissful Face', emoji: '😊', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_face_hand', name: '🤭 Face with Hand Over Mouth', emoji: '🤭', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_heart_eyes', name: '😍 Smiling Face with Heart Eyes', emoji: '😍', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_cool', name: '😎 Smiling Face with Sunglasses', emoji: '😎', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_nerd', name: '🤓 Nerd Face', emoji: '🤓', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_cat', name: '😺 Smiling Cat', emoji: '😺', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_cat_grin', name: '😸 Grinning Cat', emoji: '😸', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_cat_joy', name: '😹 Cat Tears of Joy', emoji: '😹', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_cat_heart', name: '😻 Smiling Cat with Heart Eyes', emoji: '😻', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_dog', name: '🐶 Dog Face', emoji: '🐶', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_mouse', name: '🐭 Mouse Face', emoji: '🐭', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_hamster', name: '🐹 Hamster', emoji: '🐹', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_rabbit', name: '🐰 Rabbit Face', emoji: '🐰', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_fox', name: '🦊 Fox', emoji: '🦊', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_bear', name: '🐻 Bear', emoji: '🐻', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_panda', name: '🐼 Panda', emoji: '🐼', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_frog', name: '🐸 Frog', emoji: '🐸', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_unicorn', name: '🦄 Unicorn', emoji: '🦄', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_apple', name: '🍎 Apple', emoji: '🍎', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_pizza', name: '🍕 Pizza', emoji: '🍕', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_burger', name: '🍔 Hamburger', emoji: '🍔', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_soccer', name: '⚽ Soccer Ball', emoji: '⚽', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_basketball', name: '🏀 Basketball', emoji: '🏀', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_game_controller', name: '🎮 Video Game', emoji: '🎮', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_dice', name: '🎲 Dice', emoji: '🎲', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_car', name: '🚗 Car', emoji: '🚗', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_rocket', name: '🚀 Rocket', emoji: '🚀', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_rainbow', name: '🌈 Rainbow', emoji: '🌈', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_star', name: '⭐ Star', emoji: '⭐', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_sun', name: '☀️ Sun', emoji: '☀️', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_moon', name: '🌙 Moon', emoji: '🌙', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_red_heart', name: '❤️ Red Heart', emoji: '❤️', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_blue_heart', name: '💙 Blue Heart', emoji: '💙', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_green_heart', name: '💚 Green Heart', emoji: '💚', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_yellow_heart', name: '💛 Yellow Heart', emoji: '💛', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_orange_heart', name: '🧡 Orange Heart', emoji: '🧡', rarity: 'Common' },
    { tier: 'common', cost: 50, id: 'emoji_purple_heart', name: '💜 Purple Heart', emoji: '💜', rarity: 'Common' },

    // ===== UNCOMMON - 100 COINS =====
    { tier: 'uncommon', cost: 100, id: 'emoji_kissing_heart', name: '😘 Face Blowing a Kiss', emoji: '😘', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_woozy', name: '🥴 Woozy Face', emoji: '🥴', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_hugging', name: '🤗 Hugging Face', emoji: '🤗', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_thinking', name: '🤔 Thinking Face', emoji: '🤔', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_shushing', name: '🤫 Shushing Face', emoji: '🤫', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_neutral', name: '😐 Neutral Face', emoji: '😐', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_expressionless', name: '😑 Expressionless Face', emoji: '😑', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_no_mouth', name: '😶 Face Without Mouth', emoji: '😶', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_smirk', name: '😏 Smirking Face', emoji: '😏', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_unamused', name: '😒 Unamused Face', emoji: '😒', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_roll_eyes', name: '🙄 Face with Rolling Eyes', emoji: '🙄', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_anxious', name: '😰 Anxious Face with Sweat', emoji: '😰', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_worried', name: '😟 Worried Face', emoji: '😟', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_angry', name: '😠 Angry Face', emoji: '😠', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_rage', name: '😡 Pouting Face', emoji: '😡', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_smiling_imp', name: '😈 Smiling Devil Face', emoji: '😈', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_skull', name: '💀 Skull', emoji: '💀', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_ghost', name: '👻 Ghost', emoji: '👻', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_alien', name: '👽 Alien', emoji: '👽', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_robot', name: '🤖 Robot', emoji: '🤖', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_tiger', name: '🐯 Tiger Face', emoji: '🐯', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_lion', name: '🦁 Lion', emoji: '🦁', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_cow', name: '🐮 Cow Face', emoji: '🐮', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_pig', name: '🐷 Pig Face', emoji: '🐷', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_monkey', name: '🐵 Monkey Face', emoji: '🐵', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_see_no_evil', name: '🙈 See-No-Evil Monkey', emoji: '🙈', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_penguin', name: '🐧 Penguin', emoji: '🐧', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_eagle', name: '🦅 Eagle', emoji: '🦅', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_owl', name: '🦉 Owl', emoji: '🦉', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_bat', name: '🦇 Bat', emoji: '🦇', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_wolf', name: '🐺 Wolf', emoji: '🐺', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_horse', name: '🐴 Horse Face', emoji: '🐴', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_bee', name: '🐝 Bee', emoji: '🐝', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_butterfly', name: '🦋 Butterfly', emoji: '🦋', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_turtle', name: '🐢 Turtle', emoji: '🐢', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_snake', name: '🐍 Snake', emoji: '🐍', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_octopus', name: '🐙 Octopus', emoji: '🐙', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_whale', name: '🐋 Whale', emoji: '🐋', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_watermelon', name: '🍉 Watermelon', emoji: '🍉', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_grapes', name: '🍇 Grapes', emoji: '🍇', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_strawberry', name: '🍓 Strawberry', emoji: '🍓', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_cherries', name: '🍒 Cherries', emoji: '🍒', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_peach', name: '🍑 Peach', emoji: '🍑', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_donut', name: '🍩 Donut', emoji: '🍩', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_cookie', name: '🍪 Cookie', emoji: '🍪', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_cake', name: '🍰 Cake', emoji: '🍰', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_birthday', name: '🎂 Birthday Cake', emoji: '🎂', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_coffee', name: '☕ Coffee', emoji: '☕', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_tropical_drink', name: '🍹 Tropical Drink', emoji: '🍹', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_airplane', name: '✈️ Airplane', emoji: '✈️', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_castle', name: '🏰 Castle', emoji: '🏰', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_volcano', name: '🌋 Volcano', emoji: '🌋', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_island', name: '🏝️ Island', emoji: '🏝️', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_carousel', name: '🎡 Carousel Horse', emoji: '🎡', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_roller_coaster', name: '🎢 Roller Coaster', emoji: '🎢', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_tent', name: '🎪 Circus Tent', emoji: '🎪', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_art', name: '🎨 Artist Palette', emoji: '🎨', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_microphone', name: '🎤 Microphone', emoji: '🎤', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_headphones', name: '🎧 Headphone', emoji: '🎧', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_guitar', name: '🎸 Guitar', emoji: '🎸', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_gem', name: '💎 Gem Stone', emoji: '💎', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_fire', name: '🔥 Fire', emoji: '🔥', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_lightning', name: '⚡ Lightning', emoji: '⚡', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_sparkles', name: '✨ Sparkles', emoji: '✨', rarity: 'Uncommon' },
    { tier: 'uncommon', cost: 100, id: 'emoji_speech_balloon', name: '💬 Speech Balloon', emoji: '💬', rarity: 'Uncommon' },

    // ===== RARE - 250 COINS =====
    { tier: 'rare', cost: 250, id: 'emoji_money_face', name: '🤑 Money Face', emoji: '🤑', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_sick', name: '🤒 Face with Thermometer', emoji: '🤒', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_nauseated', name: '🤢 Nauseated Face', emoji: '🤢', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_vomiting', name: '🤮 Face Vomiting', emoji: '🤮', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_sneezing', name: '🤧 Sneezing Face', emoji: '🤧', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_hot_face', name: '🥵 Hot Face', emoji: '🥵', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_cold_face', name: '🥶 Cold Face', emoji: '🥶', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_dizzy', name: '😵 Dizzy Face', emoji: '😵', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_exploding_head', name: '🤯 Exploding Head', emoji: '🤯', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_scream', name: '😱 Fearful Face', emoji: '😱', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_triumph', name: '😤 Face with Steam From Nose', emoji: '😤', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_pouting_cat', name: '😾 Pouting Cat', emoji: '😾', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_weary_cat', name: '😿 Crying Cat', emoji: '😿', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_brain', name: '🧠 Brain', emoji: '🧠', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_eye', name: '👁️ Eye', emoji: '👁️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_lips', name: '💋 Lips', emoji: '💋', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_dragon_red', name: '🐉 Dragon', emoji: '🐉', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_scorpion', name: '🦂 Scorpion', emoji: '🦂', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_spider', name: '🕷️ Spider', emoji: '🕷️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_squid', name: '🦑 Squid', emoji: '🦑', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_lobster', name: '🦞 Lobster', emoji: '🦞', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_dolphin', name: '🐬 Dolphin', emoji: '🐬', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_shark', name: '🦈 Shark', emoji: '🦈', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_crocodile', name: '🐊 Crocodile', emoji: '🐊', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_zebra', name: '🦓 Zebra', emoji: '🦓', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_gorilla', name: '🦍 Gorilla', emoji: '🦍', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_elephant', name: '🐘 Elephant', emoji: '🐘', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_giraffe', name: '🦒 Giraffe', emoji: '🦒', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_sushi', name: '🍣 Sushi', emoji: '🍣', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_ramen', name: '🍜 Ramen Bowl', emoji: '🍜', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_shrimp', name: '🍤 Shrimp', emoji: '🍤', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_takeout', name: '🥡 Takeout Box', emoji: '🥡', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_beer', name: '🍺 Beer Mug', emoji: '🍺', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_clinking_beer', name: '🍻 Clinking Beer Mugs', emoji: '🍻', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_clinking_glasses', name: '🥂 Clinking Glasses', emoji: '🥂', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_wine', name: '🍷 Wine Glass', emoji: '🍷', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_bowl_with_spoon', name: '🥣 Bowl with Spoon', emoji: '🥣', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_dart', name: '🎯 Direct Hit', emoji: '🎯', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_slot_machine', name: '🎰 Slot Machine', emoji: '🎰', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_puzzle', name: '🧩 Puzzle Piece', emoji: '🧩', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_chess_pawn', name: '♟️ Chess Pawn', emoji: '♟️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_shield', name: '🛡️ Shield', emoji: '🛡️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_crossed_swords', name: '⚔️ Crossed Swords', emoji: '⚔️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_dagger', name: '🗡️ Dagger', emoji: '🗡️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_wand', name: '🪄 Magic Wand', emoji: '🪄', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_crystal_ball', name: '🔮 Crystal Ball', emoji: '🔮', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_bomb', name: '💣 Bomb', emoji: '💣', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_explosion', name: '💥 Collision', emoji: '💥', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_biohazard', name: '☢️ Biohazard', emoji: '☢️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_meteor', name: '☄️ Meteor', emoji: '☄️', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_monocle_face', name: '🧐 Face with Monocle', emoji: '🧐', rarity: 'Rare' },
    { tier: 'rare', cost: 250, id: 'emoji_pleading_face', name: '🥺 Pleading Face', emoji: '🥺', rarity: 'Rare' },

    // ===== EPIC - 500 COINS =====
    { tier: 'epic', cost: 500, id: 'emoji_crown', name: '👑 Crown', emoji: '👑', rarity: 'Epic', description: 'Royal presence' },
    { tier: 'epic', cost: 500, id: 'emoji_diamond', name: '💠 Diamond Shape', emoji: '💠', rarity: 'Epic', description: 'Crystalline brilliance' },
    { tier: 'epic', cost: 500, id: 'emoji_trident', name: '🔱 Trident Emblem', emoji: '🔱', rarity: 'Epic', description: 'Ocean King' },
    { tier: 'epic', cost: 500, id: 'emoji_space_invader', name: '👾 Alien Monster', emoji: '👾', rarity: 'Epic', description: 'Arcade legend' },
    { tier: 'epic', cost: 500, id: 'emoji_fleur_de_lis', name: '⚜️ Fleur-de-lis', emoji: '⚜️', rarity: 'Epic', description: 'Royal crest' },
    { tier: 'epic', cost: 500, id: 'emoji_ufo', name: '🛸 Flying Saucer', emoji: '🛸', rarity: 'Epic', description: 'UFO abduction' },
    { tier: 'epic', cost: 500, id: 'emoji_evil_eye', name: '🧿 Nazar Amulet', emoji: '🧿', rarity: 'Epic', description: 'Ancient eye' },
    { tier: 'epic', cost: 500, id: 'emoji_amulet', name: '🪬 Hamsa', emoji: '🪬', rarity: 'Epic', description: 'Mystic charm' },
    { tier: 'epic', cost: 500, id: 'emoji_trophy', name: '🏆 Trophy', emoji: '🏆', rarity: 'Epic', description: 'Champion spirit' },
    { tier: 'epic', cost: 500, id: 'emoji_mask', name: '🎭 Mask', emoji: '🎭', rarity: 'Epic', description: 'Shadow persona' },

    // ===== LEGENDARY - 1000 COINS =====
    { tier: 'legendary', cost: 1000, id: 'emoji_galaxy', name: '🌌 Galaxy', emoji: '🌌', rarity: 'Legendary', description: 'Cosmic energy - animated' },
    { tier: 'legendary', cost: 1000, id: 'emoji_fire_animated', name: '🔥 Burning Flame', emoji: '🔥', rarity: 'Legendary', description: 'Moving flame - animated' },
    { tier: 'legendary', cost: 1000, id: 'emoji_eye_speech', name: '👁️‍🗨️ Watching Eye', emoji: '👁️‍🗨️', rarity: 'Legendary', description: 'All-seeing eye' },
    { tier: 'legendary', cost: 1000, id: 'emoji_radioactive', name: '☢️ Radioactive', emoji: '☢️', rarity: 'Legendary', description: 'Toxic core' },
    { tier: 'legendary', cost: 1000, id: 'emoji_dna', name: '🧬 DNA', emoji: '🧬', rarity: 'Legendary', description: 'Living code' },
    { tier: 'legendary', cost: 1000, id: 'emoji_crown_royal', name: '👑 Royal Aura', emoji: '👑', rarity: 'Legendary', description: 'Ultimate royalty' },
    { tier: 'legendary', cost: 1000, id: 'emoji_moai', name: '🗿 Moai', emoji: '🗿', rarity: 'Legendary', description: 'Ancient titan' },

    // ===== EXCLUSIVE - 2500+ COINS =====
    { tier: 'exclusive', cost: 2500, id: 'emoji_rank_1', name: '🥇 Rank #1 Trophy', emoji: '🥇', rarity: 'Exclusive', description: 'Top leaderboard only' },
    { tier: 'exclusive', cost: 5000, id: 'emoji_dev_core', name: '⚙️ Developer Core', emoji: '⚙️', rarity: 'Exclusive', description: 'Founder exclusive' },
    { tier: 'exclusive', cost: 7500, id: 'emoji_infinity', name: '♾️ Infinite Flame', emoji: '♾️', rarity: 'Exclusive', description: 'Infinite power' },
    { tier: 'exclusive', cost: 10000, id: 'emoji_prestige', name: '👑 Prestige Crown', emoji: '👑', rarity: 'Exclusive', description: 'Ultimate prestige' },
    { tier: 'exclusive', cost: 15000, id: 'emoji_diamond_prestige', name: '💠 Diamond Prestige', emoji: '💠', rarity: 'Exclusive', description: 'Maximum glory' },
    { tier: 'exclusive', cost: 25000, id: 'emoji_cosmic_emperor', name: '🌠 Cosmic Emperor', emoji: '🌠', rarity: 'Exclusive', description: 'Universal ruler' },

    // ===== FLAGS - 150 COINS EACH =====
    { tier: 'flag', cost: 150, id: 'flag_white', name: '🏳️ White Flag', emoji: '🏳️', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_black', name: '🏴 Black Flag', emoji: '🏴', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_pirate', name: '🏴‍☠️ Pirate Flag', emoji: '🏴‍☠️', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_chequered', name: '🏁 Chequered Flag', emoji: '🏁', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_red', name: '🚩 Red Flag', emoji: '🚩', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_rainbow', name: '🏳️‍🌈 Rainbow Flag', emoji: '🏳️‍🌈', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_belgium', name: '🇧🇪 Belgium', emoji: '🇧🇪', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_france', name: '🇫🇷 France', emoji: '🇫🇷', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_germany', name: '🇩🇪 Germany', emoji: '🇩🇪', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_netherlands', name: '🇳🇱 Netherlands', emoji: '🇳🇱', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_uk', name: '🇬🇧 United Kingdom', emoji: '🇬🇧', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_usa', name: '🇺🇸 United States', emoji: '🇺🇸', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_japan', name: '🇯🇵 Japan', emoji: '🇯🇵', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_korea', name: '🇰🇷 South Korea', emoji: '🇰🇷', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_canada', name: '🇨🇦 Canada', emoji: '🇨🇦', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_brazil', name: '🇧🇷 Brazil', emoji: '🇧🇷', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_italy', name: '🇮🇹 Italy', emoji: '🇮🇹', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_spain', name: '🇪🇸 Spain', emoji: '🇪🇸', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_portugal', name: '🇵🇹 Portugal', emoji: '🇵🇹', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_china', name: '🇨🇳 China', emoji: '🇨🇳', rarity: 'Flag' },
    { tier: 'flag', cost: 150, id: 'flag_australia', name: '🇦🇺 Australia', emoji: '🇦🇺', rarity: 'Flag' },
  ],
  
  name_colors: [
    { id: 'color_gold', name: 'Gold', color: '#FFD700', cost: 150 },
    { id: 'color_crimson', name: 'Crimson', color: '#DC143C', cost: 150 },
    { id: 'color_lime', name: 'Lime Green', color: '#32CD32', cost: 150 },
    { id: 'color_cyan', name: 'Cyan', color: '#00FFFF', cost: 150 },
    { id: 'color_magenta', name: 'Magenta', color: '#FF00FF', cost: 150 },
    { id: 'color_orange', name: 'Orange', color: '#FF8C00', cost: 150 },
    { id: 'color_salmon', name: 'Salmon', color: '#FA8072', cost: 150 },
    { id: 'color_orchid', name: 'Orchid', color: '#DA70D6', cost: 200 },
    { id: 'color_rainbow', name: 'Rainbow', color: '#FF6B9D', cost: 300 }
  ]
};


function createStudyRoom(username, domain) {
  return {
    id: `room_${username}_${domain}`,
    owner: username,
    domain: domain,
    theme: 'light',
    furniture: ['desk_basic', 'lamp_basic', 'chair_basic'],
    decorations: [],
    pets: [],
    level: 1,
    upgrades: 0,
    createdAt: new Date().toISOString(),
    lastVisited: new Date().toISOString(),
    customizationPoints: 0
  };
}

function getUserRoom(userKey) {
  const roomKey = `studyroom_${userKey}`;
  const stored = localStorage.getItem(roomKey);
  if (!stored) {
    const user = getUserByKey(userKey);
    if (!user) return null;
    const room = createStudyRoom(user.username, user.domain);
    localStorage.setItem(roomKey, JSON.stringify(room));
    return room;
  }
  return JSON.parse(stored);
}

function saveUserRoom(userKey, room) {
  const roomKey = `studyroom_${userKey}`;
  localStorage.setItem(roomKey, JSON.stringify(room));
}

// ============ STUDY SESSIONS ============
function startStudySession(userKey) {
  return {
    id: `session_${Date.now()}`,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0, // in minutes
    xpEarned: 0,
    coinsEarned: 0,
    focusScore: 100, // 0-100
    pauses: [],
    completed: false
  };
}

function endStudySession(session, userKey) {
  const end = new Date();
  const start = new Date(session.startTime);
  const durationMinutes = Math.floor((end - start) / 60000);
  
  session.endTime = end.toISOString();
  session.duration = durationMinutes;
  
  // Calculate rewards
  let baseXp = Math.floor(durationMinutes / 10); // 1 XP per 10 minutes
  let baseCoins = Math.floor(durationMinutes / 5); // 1 coin per 5 minutes
  
  // Bonus for longer sessions
  if (durationMinutes >= 60) {
    baseXp *= 1.5;
    baseCoins *= 1.5;
  } else if (durationMinutes >= 30) {
    baseXp *= 1.25;
    baseCoins *= 1.25;
  }
  
  // Apply focus score multiplier
  const focusMultiplier = session.focusScore / 100;
  baseXp = Math.floor(baseXp * focusMultiplier);
  baseCoins = Math.floor(baseCoins * focusMultiplier);
  
  session.xpEarned = baseXp;
  session.coinsEarned = baseCoins;
  session.completed = true;
  
  // Save to user history
  const user = getUserByKey(userKey);
  if (!user) return session;
  
  if (!user.sessions) user.sessions = [];
  user.sessions.push(session);
  
  // Add XP and coins to user
  user.xp = (user.xp || 0) + baseXp;
  user.coins = (user.coins || 0) + baseCoins;
  
  // Update level
  user.level = getCurrentLevel(user.xp);
  
  // Add to XP history
  if (!user.xpHistory) user.xpHistory = [];
  user.xpHistory.push({
    date: new Date().toLocaleDateString(),
    delta: baseXp,
    source: 'study_session'
  });
  
  saveUser(userKey, user);
  return session;
}

// ============ COINS SYSTEM ============
function getUserCoins(userKey) {
  const user = getUserByKey(userKey);
  return (user && user.coins) || 0;
}

function addCoins(userKey, amount, reason) {
  const user = getUserByKey(userKey);
  if (!user) return false;
  
  user.coins = (user.coins || 0) + amount;
  
  if (!user.coinHistory) user.coinHistory = [];
  user.coinHistory.push({
    date: new Date().toISOString(),
    amount: amount,
    reason: reason
  });
  
  saveUser(userKey, user);
  return true;
}

function spendCoins(userKey, amount, reason) {
  const user = getUserByKey(userKey);
  if (!user || (user.coins || 0) < amount) return false;
  
  user.coins -= amount;
  
  if (!user.coinHistory) user.coinHistory = [];
  user.coinHistory.push({
    date: new Date().toISOString(),
    amount: -amount,
    reason: reason
  });
  
  saveUser(userKey, user);
  return true;
}

// ============ SHOP SYSTEM ============
function canAffordItem(userKey, item) {
  return getUserCoins(userKey) >= item.cost;
}

function buyShopItem(userKey, itemId) {
  const item = FURNITURE_ITEMS.find(i => i.id === itemId);
  if (!item) return { success: false, message: 'Item not found' };
  
  if (!canAffordItem(userKey, item)) {
    return { success: false, message: 'Not enough coins' };
  }
  
  if (!spendCoins(userKey, item.cost, `Purchased ${item.name}`)) {
    return { success: false, message: 'Transaction failed' };
  }
  
  // Add item to user's room
  const room = getUserRoom(userKey);
  if (!room) return { success: false, message: 'Room not found' };
  
  if (item.category === 'pet') {
    if (!room.pets) room.pets = [];
    room.pets.push(itemId);
  } else if (item.category === 'furniture') {
    if (!room.furniture) room.furniture = [];
    room.furniture.push(itemId);
  } else if (item.category === 'decoration') {
    if (!room.decorations) room.decorations = [];
    room.decorations.push(itemId);
  }
  
  saveUserRoom(userKey, room);
  return { success: true, message: `Purchased ${item.name}` };
}

// ============ DAILY QUESTS ============
const DAILY_QUESTS_TEMPLATES = [
  { id: 'study_30m', name: 'Study for 30 minutes', type: 'study_time', target: 30, reward: { xp: 50, coins: 25 } },
  { id: 'study_60m', name: 'Study for 60 minutes', type: 'study_time', target: 60, reward: { xp: 100, coins: 50 } },
  { id: 'study_120m', name: 'Study for 2 hours', type: 'study_time', target: 120, reward: { xp: 200, coins: 100 } },
  { id: 'focus_90', name: 'Maintain 90% focus', type: 'focus', target: 90, reward: { xp: 75, coins: 40 } },
  { id: 'multiplayer_session', name: 'Join a multiplayer room', type: 'multiplayer', target: 1, reward: { xp: 50, coins: 30 } },
  { id: 'buy_item', name: 'Buy an item from the shop', type: 'purchase', target: 1, reward: { xp: 30, coins: 15 } },
  { id: 'login_streak', name: 'Log in for 7 days', type: 'streak', target: 7, reward: { xp: 150, coins: 75 } }
];

function getDailyQuests(userKey) {
  const questKey = `dailyquests_${userKey}_${new Date().toLocaleDateString()}`;
  let quests = localStorage.getItem(questKey);
  
  if (!quests) {
    // Generate random quests for today
    quests = [];
    const shuffled = DAILY_QUESTS_TEMPLATES.sort(() => Math.random() - 0.5);
    quests = shuffled.slice(0, 3).map(template => ({
      ...template,
      progress: 0,
      completed: false,
      completedAt: null
    }));
    localStorage.setItem(questKey, JSON.stringify(quests));
  } else {
    quests = JSON.parse(quests);
  }
  
  return quests;
}

function updateQuestProgress(userKey, questId, amount) {
  const questKey = `dailyquests_${userKey}_${new Date().toLocaleDateString()}`;
  let quests = JSON.parse(localStorage.getItem(questKey) || '[]');
  
  const quest = quests.find(q => q.id === questId);
  if (!quest) return false;
  
  quest.progress = Math.min(quest.progress + amount, quest.target);
  
  if (quest.progress >= quest.target && !quest.completed) {
    quest.completed = true;
    quest.completedAt = new Date().toISOString();
    
    // Award XP and coins
    const user = getUserByKey(userKey);
    if (user) {
      user.xp = (user.xp || 0) + quest.reward.xp;
      user.coins = (user.coins || 0) + quest.reward.coins;
      user.level = getCurrentLevel(user.xp);
      saveUser(userKey, user);
    }
  }
  
  localStorage.setItem(questKey, JSON.stringify(quests));
  return true;
}

// ============ MULTIPLAYER ROOMS ============
function createPublicRoom(ownerUsername, ownerDomain, roomName) {
  return {
    id: `mroom_${Date.now()}`,
    name: roomName,
    owner: ownerUsername,
    ownerDomain: ownerDomain,
    members: [{ username: ownerUsername, domain: ownerDomain, joinedAt: new Date().toISOString() }],
    maxMembers: 10,
    createdAt: new Date().toISOString(),
    isPublic: true,
    focusMode: true,
    sessionActive: false,
    sessionStartTime: null
  };
}

function getAllPublicRooms() {
  const rooms = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('mroom_')) {
      const room = JSON.parse(localStorage.getItem(key));
      if (room.isPublic) rooms.push(room);
    }
  }
  return rooms;
}

function joinMultiplayerRoom(roomId, username, domain) {
  const roomKey = `mroom_${roomId}`;
  const room = JSON.parse(localStorage.getItem(roomKey) || '{}');
  
  if (!room.id) return { success: false, message: 'Room not found' };
  if (room.members.length >= room.maxMembers) return { success: false, message: 'Room is full' };
  
  room.members.push({ username, domain, joinedAt: new Date().toISOString() });
  localStorage.setItem(roomKey, JSON.stringify(room));
  
  return { success: true, message: 'Joined room' };
}

// ============ STREAK SYSTEM ============
function updateLoginStreak(userKey) {
  const user = getUserByKey(userKey);
  if (!user) return 0;
  
  const today = new Date().toLocaleDateString();
  const lastLogin = user.lastLoginDate;
  
  if (lastLogin === today) {
    // Already logged in today
    return user.streak || 0;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();
  
  if (lastLogin === yesterdayStr) {
    // Streak continues
    user.streak = (user.streak || 0) + 1;
  } else {
    // Streak broken
    user.streak = 1;
  }
  
  user.lastLoginDate = today;
  saveUser(userKey, user);
  
  return user.streak;
}

// ============ BADGES & TITLES ============
const BADGE_CONFIG = {
  'first_session': { name: 'First Study Session', icon: '📖', requirement: 'Complete 1 study session' },
  'study_hour': { name: 'One Hour Club', icon: '⏱️', requirement: 'Complete 60 minutes of study' },
  'study_10h': { name: 'Dedicated Scholar', icon: '📚', requirement: 'Complete 10 hours of study' },
  'streak_7': { name: 'Consistent Learner', icon: '🔥', requirement: '7-day login streak' },
  'level_10': { name: 'Level 10 Achiever', icon: '⭐', requirement: 'Reach Level 10' },
  'collector': { name: 'Collector', icon: '🎨', requirement: 'Own 10 items' },
  'socialite': { name: 'Socialite', icon: '👥', requirement: 'Join 5 multiplayer rooms' }
};

function checkAndAwardBadges(userKey) {
  const user = getUserByKey(userKey);
  if (!user) return [];
  
  if (!user.badges) user.badges = [];
  const newBadges = [];
  
  // Check each badge condition
  if (user.sessions && user.sessions.length >= 1 && !user.badges.includes('first_session')) {
    user.badges.push('first_session');
    newBadges.push('first_session');
  }
  
  const totalStudyTime = (user.sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
  if (totalStudyTime >= 60 && !user.badges.includes('study_hour')) {
    user.badges.push('study_hour');
    newBadges.push('study_hour');
  }
  
  if (totalStudyTime >= 600 && !user.badges.includes('study_10h')) {
    user.badges.push('study_10h');
    newBadges.push('study_10h');
  }
  
  if ((user.streak || 0) >= 7 && !user.badges.includes('streak_7')) {
    user.badges.push('streak_7');
    newBadges.push('streak_7');
  }
  
  if ((user.level || 1) >= 10 && !user.badges.includes('level_10')) {
    user.badges.push('level_10');
    newBadges.push('level_10');
  }
  
  if (newBadges.length > 0) {
    saveUser(userKey, user);
  }
  
  return newBadges;
}

// ============ CHAT COSMETICS SHOP ============
function buyCosmeticEmoji(userKey, emojiId) {
  const cosmetic = CHAT_COSMETICS.emoji_pictures.find(e => e.id === emojiId);
  if (!cosmetic) return { success: false, message: 'Emoji not found' };
  
  if (!canAffordItem(userKey, { cost: cosmetic.cost })) {
    return { success: false, message: 'Not enough coins' };
  }
  
  if (!spendCoins(userKey, cosmetic.cost, `Purchased emoji: ${cosmetic.name}`)) {
    return { success: false, message: 'Transaction failed' };
  }
  
  // Add to user's owned cosmetics
  const user = getUserByKey(userKey);
  if (!user) return { success: false, message: 'User not found' };
  
  if (!user.ownedCosmetics) user.ownedCosmetics = { emojis: [], colors: [] };
  if (!user.ownedCosmetics.emojis.includes(emojiId)) {
    user.ownedCosmetics.emojis.push(emojiId);
  }
  
  // Update user's current emoji picture
  user.emojiPicture = cosmetic.emoji;
  
  saveUser(userKey, user);
  return { success: true, message: `Purchased ${cosmetic.name}!` };
}

function buyCosmeticNameColor(userKey, colorId) {
  const cosmetic = CHAT_COSMETICS.name_colors.find(c => c.id === colorId);
  if (!cosmetic) return { success: false, message: 'Color not found' };
  
  if (!canAffordItem(userKey, { cost: cosmetic.cost })) {
    return { success: false, message: 'Not enough coins' };
  }
  
  if (!spendCoins(userKey, cosmetic.cost, `Purchased color: ${cosmetic.name}`)) {
    return { success: false, message: 'Transaction failed' };
  }
  
  // Add to user's owned cosmetics
  const user = getUserByKey(userKey);
  if (!user) return { success: false, message: 'User not found' };
  
  if (!user.ownedCosmetics) user.ownedCosmetics = { emojis: [], colors: [] };
  if (!user.ownedCosmetics.colors.includes(colorId)) {
    user.ownedCosmetics.colors.push(colorId);
  }
  
  // Update user's current name color
  user.nameColor = cosmetic.color;
  
  saveUser(userKey, user);
  return { success: true, message: `Purchased ${cosmetic.name}!` };
}

function getUserOwnedCosmetics(userKey) {
  const user = getUserByKey(userKey);
  if (!user) return { emojis: [], colors: [] };
  
  return user.ownedCosmetics || { emojis: [], colors: [] };
}

function equipCosmeticEmoji(userKey, emojiId) {
  const user = getUserByKey(userKey);
  if (!user) return { success: false, message: 'User not found' };
  
  const cosmetic = CHAT_COSMETICS.emoji_pictures.find(e => e.id === emojiId);
  if (!cosmetic) return { success: false, message: 'Emoji not found' };
  
  // Check if user owns this emoji
  if (!user.ownedCosmetics || !user.ownedCosmetics.emojis.includes(emojiId)) {
    return { success: false, message: 'You don\'t own this emoji' };
  }
  
  user.emojiPicture = cosmetic.emoji;
  saveUser(userKey, user);
  return { success: true, message: `Equipped ${cosmetic.name}!` };
}

function equipCosmeticColor(userKey, colorId) {
  const user = getUserByKey(userKey);
  if (!user) return { success: false, message: 'User not found' };
  
  const cosmetic = CHAT_COSMETICS.name_colors.find(c => c.id === colorId);
  if (!cosmetic) return { success: false, message: 'Color not found' };
  
  // Check if user owns this color
  if (!user.ownedCosmetics || !user.ownedCosmetics.colors.includes(colorId)) {
    return { success: false, message: 'You don\'t own this color' };
  }
  
  user.nameColor = cosmetic.color;
  saveUser(userKey, user);
  return { success: true, message: `Equipped ${cosmetic.name}!` };
}

function getCurrentEquippedCosmetics(userKey) {
  const user = getUserByKey(userKey);
  if (!user) return { emoji: null, color: null, emojiId: null, colorId: null };
  
  const cosmetics = CHAT_COSMETICS;
  let currentEmojiId = null;
  let currentColorId = null;
  
  // Find which emoji is currently equipped
  if (user.emojiPicture) {
    const emoji = cosmetics.emoji_pictures.find(e => e.emoji === user.emojiPicture);
    if (emoji) currentEmojiId = emoji.id;
  }
  
  // Find which color is currently equipped
  if (user.nameColor) {
    const color = cosmetics.name_colors.find(c => c.color === user.nameColor);
    if (color) currentColorId = color.id;
  }
  
  return {
    emoji: user.emojiPicture,
    color: user.nameColor,
    emojiId: currentEmojiId,
    colorId: currentColorId
  };
}

// ============ GLOBAL EXPORTS ============
window.progressionAPI = {
  // Leveling
  getCurrentLevel,
  getXpProgressInLevel,
  
  // Rooms
  getUserRoom,
  saveUserRoom,
  createStudyRoom,
  
  // Sessions
  startStudySession,
  endStudySession,
  
  // Coins
  getUserCoins,
  addCoins,
  spendCoins,
  
  // Shop
  canAffordItem,
  buyShopItem,
  FURNITURE_ITEMS,
  
  // Quests
  getDailyQuests,
  updateQuestProgress,
  DAILY_QUESTS_TEMPLATES,
  
  // Multiplayer
  createPublicRoom,
  getAllPublicRooms,
  joinMultiplayerRoom,
  
  // Streaks
  updateLoginStreak,
  
  // Badges
  checkAndAwardBadges,
  BADGE_CONFIG,
  
  // Chat Cosmetics
  buyCosmeticEmoji,
  buyCosmeticNameColor,
  getUserOwnedCosmetics,
  equipCosmeticEmoji,
  equipCosmeticColor,
  getCurrentEquippedCosmetics,
  CHAT_COSMETICS,
  
  // Config
  LEVEL_CONFIG,
  FURNITURE_ITEMS,
  ROOM_THEMES
};
