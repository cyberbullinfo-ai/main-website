const puppeteer = require('puppeteer');

(async () => {
  const BASE = 'http://localhost:3000';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('1) Open login page');
    await page.goto(BASE + '/cyberbull-login.html', { waitUntil: 'networkidle2' });
    const loginBtn = await page.$('#loginButton');
    if (!loginBtn) throw new Error('Login button not found');
    console.log('Login page OK');

    console.log('2) Open games page and launch a game');
    await page.goto(BASE + '/cyberbull-games.html', { waitUntil: 'networkidle2' });
    const playFlappy = await page.evaluate(() => {
      const el = document.querySelector('.game-card');
      if (!el) return false;
      el.click();
      return true;
    });
    if (!playFlappy) throw new Error('Game card not found or click failed');
    console.log('Clicked a game card — navigation may occur depending on implementation');

    console.log('3) Open global chat page');
    await page.goto(BASE + '/cyberbull-global-chat.html', { waitUntil: 'networkidle2' });
    const sendBtn = await page.$('.send-btn');
    if (!sendBtn) throw new Error('Send button not found on global chat');
    console.log('Global chat page OK');

    console.log('4) Open create-account page');
    await page.goto(BASE + '/cyberbull-create-account.html', { waitUntil: 'networkidle2' });
    const pwd = await page.$('#password');
    if (!pwd) throw new Error('Create-account page missing password input');
    console.log('Create-account page OK');

    console.log('Browser smoke tests passed (basic checks)');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Browser smoke test failed:', err);
    await browser.close();
    process.exit(2);
  }
})();
