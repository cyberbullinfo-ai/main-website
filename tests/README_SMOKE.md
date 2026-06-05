Smoke tests for the CyberBull local server

Prerequisites
- Node.js (to run the server)
- Python 3 (to run the smoke test script)

Start the server (in project root):

```powershell
node pong-server.js
```

Run the smoke tests (in a separate terminal):

```powershell
python tests\smoke_test.py
```

Notes
- The smoke test will create a temporary user `user_testschool_testuser` and then delete it.
- If `node` is not installed on this machine, install it from https://nodejs.org/ or run the server in an environment that has Node.js.
