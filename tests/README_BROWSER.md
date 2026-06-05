Puppeteer browser smoke tests

Prerequisites
- Node.js (LTS)
- Install dev dependencies (run in project root):

```powershell
npm install --save-dev puppeteer
```

Run the server (project root):

```powershell
node pong-server.js
```

Run the browser smoke tests (in another terminal):

```powershell
node tests\browser_smoke.js
```

Notes
- The server now serves static files from the project root so the pages are reachable at `http://localhost:3000/<page>.html`.
- Puppeteer will run headless by default; remove `headless: true` in `tests/browser_smoke.js` to see the browser.
