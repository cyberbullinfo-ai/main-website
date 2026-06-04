(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const currentUserKey = localStorage.getItem('currentUserKey');
  let W = 800, H = 500;
  const DPR = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, rect.width);
    H = Math.max(200, rect.width * 0.6);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  const paddleW = 10; const paddleH = 90; const speed = 6;
  const left = {x: 20, y: 0, vy:0};
  const right = {x: () => W - 20 - paddleW, y: 0, vy:0};
  const ball = {x: 0, y: 0, vx: 0, vy: 0, r: 8};
  let scoreL = 0, scoreR = 0;
  let running = false, lastT = 0;
  const keys = {};

  // Networking and AI
  let ws = null; let online = false; let isHost = false; let opponent = {y:0};
  let aiEnabled = false; const speedOptions = [1,1.4,1.8,2]; let speedIndex = 0; let speedMultiplier = 1;

  function restart() {
    scoreL = 0; scoreR = 0; resetBall(1);
  }

  function resetBall(dir = (Math.random()>.5?1:-1)) {
    ball.x = W/2; ball.y = H/2; ball.vx = 5 * dir * speedMultiplier; ball.vy = (Math.random()*4 - 2) * speedMultiplier;
    left.y = H/2 - paddleH/2; right.y = H/2 - paddleH/2;
    running = false;
  }

  function step(t) {
    if(!lastT) lastT = t; const dt = Math.min(40, t - lastT); lastT = t;
    update(dt/16.67);
    draw();
    requestAnimationFrame(step);
  }

  function update(dt) {
    // paddles local control
    if(keys['KeyW']) left.y -= speed * dt;
    if(keys['KeyS']) left.y += speed * dt;
    if(!online) {
      if(aiEnabled) {
        // simple AI: follow the ball with limited speed
        const center = right.y + paddleH/2;
        const diff = ball.y - center;
        const maxMove = (speed + 1.5) * dt * (1 + (speedIndex*0.4));
        right.y += Math.max(-maxMove, Math.min(maxMove, diff * 0.12));
      } else {
        if(keys['ArrowUp']) right.y -= speed * dt;
        if(keys['ArrowDown']) right.y += speed * dt;
      }
    }

    left.y = Math.max(0, Math.min(H - paddleH, left.y));
    right.y = Math.max(0, Math.min(H - paddleH, right.y));

    if(!running) return;

    if(online) {
      // Online: host simulates ball, client receives ball updates
      if(isHost) {
        simulateBall(dt);
        sendWs('ball', {x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy});
      }
    } else {
      // Local simulation
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      // collisions & scoring
      simulateCollisions();
    }

    // send paddle position when online
    if(online && ws && ws.readyState === WebSocket.OPEN) {
      sendWs('paddle', {y: left.y});
    }
  }

  function simulateBall(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // top/bottom
    if(ball.y - ball.r < 0){ ball.y = ball.r; ball.vy *= -1 }
    if(ball.y + ball.r > H){ ball.y = H - ball.r; ball.vy *= -1 }
    // left paddle
    if(ball.x - ball.r < left.x + paddleW) {
      if(ball.y > left.y && ball.y < left.y + paddleH) {
        ball.x = left.x + paddleW + ball.r; ball.vx *= -1.08; ball.vy += (ball.y - (left.y + paddleH/2)) * 0.03;
      }
    }
    // right paddle
    if(ball.x + ball.r > right.x() ) {
      if(ball.y > right.y && ball.y < right.y + paddleH) {
        ball.x = right.x() - ball.r; ball.vx *= -1.08; ball.vy += (ball.y - (right.y + paddleH/2)) * 0.03;
      }
    }
    // score
    if(ball.x < -50) { scoreR++; resetBall(1); sendWs('score', {scoreL, scoreR}); awardCoinsForScore(); }
    if(ball.x > W + 50) { scoreL++; resetBall(-1); sendWs('score', {scoreL, scoreR}); awardCoinsForScore(); }
  }

  function simulateCollisions() {
    // top/bottom
    if(ball.y - ball.r < 0){ ball.y = ball.r; ball.vy *= -1 }
    if(ball.y + ball.r > H){ ball.y = H - ball.r; ball.vy *= -1 }

    // left paddle
    if(ball.x - ball.r < left.x + paddleW) {
      if(ball.y > left.y && ball.y < left.y + paddleH) {
        ball.x = left.x + paddleW + ball.r; ball.vx *= -1.08; ball.vy += (ball.y - (left.y + paddleH/2)) * 0.03;
      }
    }
    // right paddle
    if(ball.x + ball.r > right.x() ) {
      if(ball.y > right.y && ball.y < right.y + paddleH) {
        ball.x = right.x() - ball.r; ball.vx *= -1.08; ball.vy += (ball.y - (right.y + paddleH/2)) * 0.03;
      }
    }

    // score
    if(ball.x < -50) { scoreR++; resetBall(1); awardCoinsForScore(); }
    if(ball.x > W + 50) { scoreL++; resetBall(-1); awardCoinsForScore(); }
  }

  function awardCoinsForScore() {
    if (window.progressionAPI && currentUserKey) {
      window.progressionAPI.addCoins(currentUserKey, 5, 'Pong game score');
    }
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    // middle line
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for(let y=10;y<H;y+=30) ctx.fillRect(W/2 -1, y, 2, 18);
    // paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(left.x, left.y, paddleW, paddleH);
    ctx.fillRect(right.x(), right.y, paddleW, paddleH);
    // ball
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
    // scores
    ctx.font = '30px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#e2e8f0';
    ctx.fillText(scoreL, W*0.25, 40); ctx.fillText(scoreR, W*0.75, 40);
    if(!running) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font='18px Inter'; ctx.fillText('Press Space to Start', W/2, H - 24);
    }
  }

  // Networking helpers
  function sendWs(type, data) {
    if(!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({type, data}));
  }

  function connectWs() {
    if(ws) ws.close();
    const status = document.getElementById('onlineStatus');
    try {
      ws = new WebSocket('ws://localhost:3000');
    } catch(e) { status.textContent = 'Failed to create WebSocket'; return }
    status.textContent = 'Connecting...';
    ws.addEventListener('open', () => { status.textContent = 'Connected. Click Find Online Match.'; online = true;
      // if a room was specified in URL, auto-join it
      if(pendingRoomId) { sendWs('join', {roomId: pendingRoomId}); status.textContent = 'Joining room...'; }
    });
    ws.addEventListener('message', ev => {
      try {
        const msg = JSON.parse(ev.data);
        handleWs(msg.type, msg.data);
      } catch(e) { console.error(e) }
    });
    ws.addEventListener('close', () => { online = false; isHost = false; document.getElementById('onlineStatus').textContent = 'Disconnected from server' });
  }

  function handleWs(type, data) {
    const status = document.getElementById('onlineStatus');
    if(type === 'paired') {
      isHost = !!data.isHost; status.textContent = isHost ? 'Matched — you are host' : 'Matched — you are client';
      // host starts the ball
      if(isHost) { resetBall(Math.random()>.5?1:-1); running = true }
    }
    if(type === 'paddle') {
      // opponent paddle y
      opponent.y = data.y;
      right.y = data.y; // show opponent on right
    }
    if(type === 'ball') {
      // client receives authoritative ball
      ball.x = data.x; ball.y = data.y; ball.vx = data.vx; ball.vy = data.vy;
    }
    if(type === 'score') {
      scoreL = data.scoreL; scoreR = data.scoreR;
    }
    if(type === 'status') { status.textContent = data.msg }
  }

  function findMatch() {
    findMatchWithRoom();
  }

  function findMatchWithRoom(roomId) {
    if(roomId) pendingRoomId = roomId;
    if(!ws || ws.readyState !== WebSocket.OPEN) connectWs();
    if(ws && ws.readyState === WebSocket.OPEN) {
      sendWs('join', {roomId: pendingRoomId || undefined});
      document.getElementById('onlineStatus').textContent = 'Searching for opponent...';
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', e => { keys[e.code] = true; if(e.code==='Space'){ running = true } });
  window.addEventListener('keyup', e => { keys[e.code] = false });
  document.getElementById('restart').addEventListener('click', ()=>{ restart(); running = false });
  document.getElementById('findMatch').addEventListener('click', ()=>{ findMatch() });
  document.getElementById('aiToggle').addEventListener('change', (e)=>{ aiEnabled = e.target.checked; if(aiEnabled) document.getElementById('speedBtn').disabled = false });
  document.getElementById('speedBtn').addEventListener('click', ()=>{
    if(online) return; speedIndex = (speedIndex + 1) % speedOptions.length; speedMultiplier = speedOptions[speedIndex];
    document.getElementById('speedBtn').textContent = 'Speed: x' + speedMultiplier;
  });

  // init
  resize(); resetBall( (Math.random()>.5?1:-1) );
  // check URL for room invites
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  let pendingRoomId = null;
  if(roomParam) { pendingRoomId = roomParam; connectWs(); document.getElementById('onlineStatus').textContent = 'Connecting to invite...'; }

  requestAnimationFrame(step);
})();
