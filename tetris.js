// ===== CONSTANTS =====
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;
const currentUserKey = localStorage.getItem('currentUserKey');

const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
  L: { shape: [[1, 0], [1, 0], [1, 1]], color: '#f0a000' },
  J: { shape: [[0, 1], [0, 1], [1, 1]], color: '#0000f0' },
};

// ===== GAME STATE =====
let gameState = {
  running: false,
  paused: false,
  gameOver: false,
};

let gameData = {
  board: [],
  currentPiece: null,
  nextPiece: null,
  score: 0,
  lines: 0,
  level: 1,
  highScore: localStorage.getItem('tetrisHighScore') || 0,
};

let gameSpeed = {
  frameCount: 0,
  dropInterval: 60,
};

// ===== INIT =====
function initGame() {
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    window.location.href = 'cyberbull-landing.html';
  }
  initBoard();
  updateHighScore();
  setupEventListeners();
}

function setupEventListeners() {
  document.addEventListener('keydown', handleKeyPress);
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();
}

function initBoard() {
  gameData.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function resizeCanvases() {
  const canvas = document.getElementById('gameCanvas');
  canvas.style.maxWidth = '100%';
}

// ===== PIECE MANAGEMENT =====
function createPiece() {
  const keys = Object.keys(TETROMINOES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  const tetromino = TETROMINOES[type];
  return {
    type,
    shape: tetromino.shape.map(row => [...row]),
    color: tetromino.color,
    x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
    y: 0,
  };
}

function rotatePiece(piece) {
  const rotated = [];
  const n = piece.shape.length;
  const m = piece.shape[0].length;

  for (let i = 0; i < m; i++) {
    const row = [];
    for (let j = n - 1; j >= 0; j--) {
      row.push(piece.shape[j][i]);
    }
    rotated.push(row);
  }

  return rotated;
}

function canPlacePiece(piece, newShape = null) {
  const shape = newShape || piece.shape;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const x = piece.x + col;
        const y = piece.y + row;

        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
          if (y >= ROWS) return false;
          if (x < 0 || x >= COLS) return false;
        }

        if (y >= 0 && gameData.board[y] && gameData.board[y][x]) {
          return false;
        }
      }
    }
  }
  return true;
}

function lockPiece(piece) {
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col]) {
        const x = piece.x + col;
        const y = piece.y + row;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
          gameData.board[y][x] = piece.color;
        }
      }
    }
  }
}

// ===== LINE CLEARING =====
function clearLines() {
  let linesCleared = 0;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (gameData.board[row].every(cell => cell !== 0)) {
      gameData.board.splice(row, 1);
      gameData.board.unshift(Array(COLS).fill(0));
      linesCleared++;
    }
  }

  if (linesCleared > 0) {
    gameData.lines += linesCleared;
    const points = [0, 100, 300, 500, 800];
    gameData.score += (points[linesCleared] || 800) * gameData.level;
    gameData.level = Math.floor(gameData.lines / 10) + 1;
    gameSpeed.dropInterval = Math.max(10, 60 - gameData.level * 3);
    awardCoinsForLines(linesCleared);
    updateUI();
  }
}

function awardCoinsForLines(linesCleared) {
  if (window.progressionAPI && currentUserKey) {
    const coinReward = linesCleared * 10; // 10 coins per line
    window.progressionAPI.addCoins(currentUserKey, coinReward, `Tetris: ${linesCleared} lines cleared`);
  }
}

// ===== GAME LOOP =====
function gameLoop() {
  gameSpeed.frameCount++;

  if (gameState.running && !gameState.paused) {
    if (gameSpeed.frameCount % gameSpeed.dropInterval === 0) {
      update();
    }
  }

  draw();

  if (gameState.running) {
    requestAnimationFrame(gameLoop);
  }
}

function update() {
  if (!gameData.currentPiece) {
    gameData.currentPiece = gameData.nextPiece || createPiece();
    gameData.nextPiece = createPiece();
    drawNextPiece();
  }

  const piece = gameData.currentPiece;
  piece.y++;

  if (!canPlacePiece(piece)) {
    piece.y--;
    lockPiece(piece);
    clearLines();

    gameData.currentPiece = gameData.nextPiece;
    gameData.nextPiece = createPiece();
    drawNextPiece();

    if (!canPlacePiece(gameData.currentPiece)) {
      endGame();
    }
  }
}

function draw() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0f1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid
  ctx.strokeStyle = 'rgba(0, 240, 240, 0.1)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * BLOCK_SIZE, 0);
    ctx.lineTo(i * BLOCK_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * BLOCK_SIZE);
    ctx.lineTo(canvas.width, i * BLOCK_SIZE);
    ctx.stroke();
  }

  // Draw board
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (gameData.board[row][col]) {
        ctx.fillStyle = gameData.board[row][col];
        ctx.fillRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
      }
    }
  }

  // Draw current piece
  if (gameData.currentPiece) {
    const piece = gameData.currentPiece;
    ctx.fillStyle = piece.color;
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const x = piece.x + col;
          const y = piece.y + row;
          ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        }
      }
    }
  }

  // Draw game over overlay
  if (gameState.gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
  }
}

function drawNextPiece() {
  const canvas = document.getElementById('nextCanvas');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0f1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameData.nextPiece) {
    const piece = gameData.nextPiece;
    const offsetX = (canvas.width - piece.shape[0].length * 24) / 2;
    const offsetY = (canvas.height - piece.shape.length * 24) / 2;

    ctx.fillStyle = piece.color;
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          ctx.fillRect(offsetX + col * 24 + 1, offsetY + row * 24 + 1, 22, 22);
        }
      }
    }
  }
}

// ===== GAME CONTROL =====
function startGame() {
  if (gameState.running) return;

  initBoard();
  gameData.currentPiece = null;
  gameData.nextPiece = createPiece();
  gameData.score = 0;
  gameData.lines = 0;
  gameData.level = 1;
  gameState.gameOver = false;
  gameState.running = true;
  gameState.paused = false;
  gameSpeed.frameCount = 0;
  gameSpeed.dropInterval = 60;

  drawNextPiece();
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

function hardDrop() {
  if (!gameState.running || gameState.paused) return;

  const piece = gameData.currentPiece;
  while (canPlacePiece(piece)) {
    piece.y++;
  }
  piece.y--;
  lockPiece(piece);
  clearLines();
  gameData.currentPiece = gameData.nextPiece;
  gameData.nextPiece = createPiece();
  drawNextPiece();

  if (!canPlacePiece(gameData.currentPiece)) {
    endGame();
  }
}

function endGame() {
  gameState.running = false;
  gameState.gameOver = true;
  document.getElementById('playBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;

  if (gameData.score > gameData.highScore) {
    gameData.highScore = gameData.score;
    localStorage.setItem('tetrisHighScore', gameData.highScore);
  }

  updateUI();
  updateStatus();
}

function handleKeyPress(e) {
  if (!gameState.running || gameState.gameOver || gameState.paused) return;

  const piece = gameData.currentPiece;

  switch (e.key.toLowerCase()) {
    case 'arrowleft':
    case 'a':
      piece.x--;
      if (!canPlacePiece(piece)) piece.x++;
      e.preventDefault();
      break;
    case 'arrowright':
    case 'd':
      piece.x++;
      if (!canPlacePiece(piece)) piece.x--;
      e.preventDefault();
      break;
    case 'arrowdown':
    case 's':
      piece.y++;
      if (!canPlacePiece(piece)) piece.y--;
      e.preventDefault();
      break;
    case ' ':
    case 'arrowup':
    case 'w':
      const rotated = rotatePiece(piece);
      const originalShape = piece.shape;
      piece.shape = rotated;
      if (!canPlacePiece(piece)) {
        piece.shape = originalShape;
      }
      e.preventDefault();
      break;
  }
}

// ===== MULTIPLAYER & FRIENDS =====
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
    game: 'tetris',
    roomId: roomCode,
    timestamp: Date.now(),
  };

  const inviteKey = `invite_${friend}`;
  localStorage.setItem(inviteKey, JSON.stringify(invite));

  alert(`Invite sent to ${friend}!`);
  closeFriendModal();
}

function generateRoomCode() {
  return 'tetris-' + Math.random().toString(36).substr(2, 9);
}

// ===== UI UPDATES =====
function updateUI() {
  document.getElementById('score').textContent = gameData.score;
  document.getElementById('lines').textContent = gameData.lines;
  document.getElementById('level').textContent = gameData.level;
  updateStatus();
}

function updateHighScore() {
  document.getElementById('highScore').textContent = gameData.highScore;
}

function updateStatus() {
  const status = document.getElementById('status');
  if (gameState.gameOver) {
    status.textContent = `GAME OVER - Final Score: ${gameData.score}`;
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
  window.location.href = 'cyberbull-tetris.html';
}

// ===== INIT =====
window.addEventListener('load', initGame);
