// ===== GAME STATE =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentUserKey = localStorage.getItem('currentUserKey');

let gameState = {
  running: false,
  paused: false,
  gameOver: false,
  aiMode: false,
  multiplayer: false,
  isHost: false,
  roomId: null,
  playerId: null,
};

let snake = {
  body: [{ x: 10, y: 10 }],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  length: 1,
};

let food = { x: 15, y: 15 };

let gameStats = {
  score: 0,
  speed: 5,
  foodEaten: 0,
  highScore: localStorage.getItem('snakeHighScore') || 0,
};

let frameCount = 0;
let lastFrameIndex = 0;

// ===== INIT & UI =====
function initGame() {
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    window.location.href = 'cyberbull-landing.html';
  }
  updateHighScore();
  setupEventListeners();
}

function setupEventListeners() {
  document.addEventListener('keydown', handleKeyPress);
  window.addEventListener('resize', resize);
  resize();
}

function handleKeyPress(e) {
  if (!gameState.running || gameState.gameOver) return;

  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      if (snake.direction.y === 0) snake.nextDirection = { x: 0, y: -1 };
      e.preventDefault();
      break;
    case 'arrowdown':
    case 's':
      if (snake.direction.y === 0) snake.nextDirection = { x: 0, y: 1 };
      e.preventDefault();
      break;
    case 'arrowleft':
    case 'a':
      if (snake.direction.x === 0) snake.nextDirection = { x: -1, y: 0 };
      e.preventDefault();
      break;
    case 'arrowright':
    case 'd':
      if (snake.direction.x === 0) snake.nextDirection = { x: 1, y: 0 };
      e.preventDefault();
      break;
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.style.maxWidth = '100%';
}

// ===== GAME LOOP =====
function gameLoop() {
  frameCount++;

  if (gameState.running && !gameState.paused) {
    const updateInterval = Math.max(1, Math.floor(60 / gameStats.speed));

    if (frameCount % updateInterval === 0) {
      update();
    }
  }

  draw();

  if (gameState.running) {
    requestAnimationFrame(gameLoop);
  }
}

function update() {
  snake.direction = snake.nextDirection;

  const head = { x: snake.body[0].x + snake.direction.x, y: snake.body[0].y + snake.direction.y };

  // Wall collision
  const gridSize = 20;
  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
    endGame();
    return;
  }

  // Self collision
  for (let segment of snake.body) {
    if (head.x === segment.x && head.y === segment.y) {
      endGame();
      return;
    }
  }

  snake.body.unshift(head);

  // Food collision
  if (head.x === food.x && head.y === food.y) {
    gameStats.foodEaten++;
    gameStats.score += Math.floor(gameStats.speed * 10);
    gameStats.speed = Math.min(15, 5 + Math.floor(gameStats.foodEaten / 5));
    awardCoinsForFood();
    updateUI();
    spawnFood();
  } else {
    snake.body.pop();
  }

  snake.length = snake.body.length;

  // Send multiplayer update
  if (gameState.multiplayer && gameState.isHost) {
    sendGameState();
  }

  // AI move
  if (gameState.aiMode && !gameState.multiplayer) {
    updateAI();
  }
}

function awardCoinsForFood() {
  if (window.progressionAPI && currentUserKey) {
    const coinReward = Math.floor(gameStats.speed);
    window.progressionAPI.addCoins(currentUserKey, coinReward, 'Snake game food eaten');
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = 'rgba(76, 175, 80, 0.1)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 20; i++) {
    const px = (i * canvas.width) / 20;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, px);
    ctx.lineTo(canvas.width, px);
    ctx.stroke();
  }

  // Draw snake
  const cellSize = canvas.width / 20;
  snake.body.forEach((segment, index) => {
    if (index === 0) {
      ctx.fillStyle = '#4CAF50';
      ctx.shadowColor = 'rgba(76, 175, 80, 0.8)';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#388E3C';
      ctx.shadowColor = 'none';
    }
    ctx.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
  });
  ctx.shadowColor = 'none';

  // Draw food
  ctx.fillStyle = '#FF5722';
  ctx.shadowColor = 'rgba(255, 87, 34, 0.8)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'none';

  // Draw game over overlay
  if (gameState.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
  }
}

function spawnFood() {
  let newFood;
  let collision = true;
  while (collision) {
    newFood = {
      x: Math.floor(Math.random() * 20),
      y: Math.floor(Math.random() * 20),
    };
    collision = snake.body.some(s => s.x === newFood.x && s.y === newFood.y);
  }
  food = newFood;
}

// ===== GAME CONTROL =====
function startGame() {
  if (gameState.running) return;

  snake.body = [{ x: 10, y: 10 }];
  snake.direction = { x: 1, y: 0 };
  snake.nextDirection = { x: 1, y: 0 };
  gameStats.score = 0;
  gameStats.speed = 5;
  gameStats.foodEaten = 0;
  gameState.gameOver = false;
  gameState.running = true;
  gameState.paused = false;
  frameCount = 0;

  spawnFood();
  updateUI();
  document.getElementById('playBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;
  gameLoop();
}

function togglePause() {
  if (!gameState.running) return;
  gameState.paused = !gameState.paused;
  document.getElementById('pauseBtn').textContent = gameState.paused ? 'Resume' : 'Pause';
  updateStatus();
}

function endGame() {
  gameState.running = false;
  gameState.gameOver = true;
  document.getElementById('playBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;

  if (gameStats.score > gameStats.highScore) {
    gameStats.highScore = gameStats.score;
    localStorage.setItem('snakeHighScore', gameStats.highScore);
  }

  updateUI();
  updateStatus();
}

function toggleAI() {
  if (gameState.running) return;
  gameState.aiMode = !gameState.aiMode;
  document.getElementById('aiToggle').textContent = gameState.aiMode ? 'AI: ON' : 'AI: OFF';
  document.getElementById('aiToggle').style.background = gameState.aiMode ? '#ff9800' : '#4CAF50';
}

// ===== AI LOGIC =====
let aiDirection = { x: 1, y: 0 };

function updateAI() {
  const head = snake.body[0];
  const dx = food.x - head.x;
  const dy = food.y - head.y;

  const moves = [];

  if (dx > 0 && aiDirection.x === 0) moves.push({ x: 1, y: 0 });
  if (dx < 0 && aiDirection.x === 0) moves.push({ x: -1, y: 0 });
  if (dy > 0 && aiDirection.y === 0) moves.push({ x: 0, y: 1 });
  if (dy < 0 && aiDirection.y === 0) moves.push({ x: 0, y: -1 });

  if (moves.length > 0) {
    aiDirection = moves[Math.floor(Math.random() * moves.length)];
  } else {
    const safeDirections = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].filter(
      dir =>
        !(aiDirection.x === -dir.x && aiDirection.y === -dir.y) &&
        isDirectionSafe(dir),
    );

    if (safeDirections.length > 0) {
      aiDirection = safeDirections[Math.floor(Math.random() * safeDirections.length)];
    }
  }

  snake.nextDirection = aiDirection;
}

function isDirectionSafe(dir) {
  const head = snake.body[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  if (newHead.x < 0 || newHead.x >= 20 || newHead.y < 0 || newHead.y >= 20) {
    return false;
  }

  for (let segment of snake.body) {
    if (newHead.x === segment.x && newHead.y === segment.y) {
      return false;
    }
  }

  return true;
}

// ===== MULTIPLAYER & FRIENDS =====
function findMatch() {
  // Placeholder for multiplayer matchmaking
  alert('Multiplayer coming soon!');
}

function openFriendModal() {
  document.getElementById('friendModal').classList.add('open');
  populateFriends();
  document.getElementById('roomCode').value = generateRoomCode();
}

function closeFriendModal() {
  document.getElementById('friendModal').classList.remove('open');
}

function populateFriends() {
  const friends = JSON.parse(localStorage.getItem('friends') || '[]');
  const select = document.getElementById('friendSelect');
  select.innerHTML = '<option value="">Select a friend...</option>';
  friends.forEach(friend => {
    const option = document.createElement('option');
    option.value = friend;
    option.textContent = friend;
    select.appendChild(option);
  });
}

function sendInvite() {
  const friendSelect = document.getElementById('friendSelect');
  const friend = friendSelect.value;

  if (!friend) {
    alert('Please select a friend');
    return;
  }

  const roomCode = document.getElementById('roomCode').value;
  const invite = {
    from: localStorage.getItem('currentUser'),
    game: 'snake',
    roomId: roomCode,
    timestamp: Date.now(),
  };

  const inviteKey = `invite_${friend}`;
  localStorage.setItem(inviteKey, JSON.stringify(invite));

  alert(`Invite sent to ${friend}!`);
  closeFriendModal();
}

function generateRoomCode() {
  return 'snake-' + Math.random().toString(36).substr(2, 9);
}

// WebSocket placeholder
function connectWs() {
  // Not implemented yet for snake
}

function sendGameState() {
  // Not implemented yet for snake
}

// ===== UI UPDATES =====
function updateUI() {
  document.getElementById('score').textContent = gameStats.score;
  document.getElementById('length').textContent = snake.body.length;
  document.getElementById('speed').textContent = gameStats.speed.toFixed(1);
  updateStatus();
}

function updateHighScore() {
  document.getElementById('highScore').textContent = gameStats.highScore;
}

function updateStatus() {
  const status = document.getElementById('status');
  if (gameState.gameOver) {
    status.textContent = `GAME OVER - Final Score: ${gameStats.score}`;
    status.className = 'status game-over';
  } else if (gameState.paused) {
    status.textContent = 'PAUSED';
    status.className = 'status';
  } else if (gameState.running) {
    status.textContent = 'PLAYING';
    status.className = 'status playing';
  } else {
    status.textContent = 'Press Play to Start';
    status.className = 'status';
  }
}

function goHome() {
  window.location.href = 'cyberbull-snake.html';
}

// ===== INIT =====
window.addEventListener('load', initGame);
