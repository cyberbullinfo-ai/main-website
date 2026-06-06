# CyberBull Student Admin Dashboard

This project uses HTML, CSS, JavaScript, and a Node.js backend server for global account persistence.

## Key pages

- `landing.html` — app entry point for login or account creation.
- `domain.html` — choose a school domain or `admin@cyberbull` for admin login.
- `index.html` — login page for students and admins.
- `create-account.html` — account registration page.
- `home.html` — student dashboard and fallback admin redirect.
- `admin-dashboard.html` — dedicated admin dashboard.
- `admin.js` — admin dashboard logic and account management helpers.

## Admin features

- Separate admin dashboard at `admin-dashboard.html`.
- Account Manager:
  - View all registered users.
  - Search by username or domain.
  - Filter by domain.
  - See username, domain, XP, level, achievements, streak.
  - Inspect a user profile for sessions, goals, and XP history.
  - Delete, suspend/unsuspend, reset passwords.
- Statistics Overview:
  - Total users.
  - Active users in last 30 days.
  - Total study hours.
  - Most active students.
  - Most common school domains.
- User Profile Inspector:
  - View sessions, weekly progress, goals, achievements, XP history.
- Admin Tools:
  - Create announcements.
  - Add challenges.
  - Add/remove achievements.
  - Define XP reward values.
  - Set admin creation secret.

## Login flow notes

- This project now supports global accounts through the Node.js backend API at `/api/*`.
- Student and admin accounts are stored in `db.json` on the server.
- If the backend is unavailable, the site can also fallback to Firebase profile storage when `firebase-api.js` is enabled.
- `create-account.html` stores rich user records with `xp`, `level`, `achievements`, `sessions`, `goals`, and `isAdmin`.
- Student login uses `currentUser`, `currentUserKey`, and `currentSchool` to keep session state.
- Admin accounts created with the admin secret are marked as `isAdmin` and are redirected to the admin dashboard.
- The student `home.html` page blocks admin sessions and redirects them to `admin-dashboard.html`.

## Running the server

1. Install dependencies:

```bash
npm install
```

2. Start the Node.js server:

```bash
npm start
```

3. Open the app in your browser at:

```text
http://localhost:3000/
```

4. Use the normal flow:
   - open `cyberbull-landing.html`
   - create or log in to an account
   - admin users can sign in with `admin@cyberbull` and the admin secret

## Notes for deployment

- This repo is not just a static GitHub Pages site anymore: to use backend global accounts, you must run the Node server or deploy it to a Node host.
- `db.json` stores your persistent users and chat state. Keep it with the server deployment.
- If you want a public deployment, host `pong-server.js` on any Node-compatible provider and use the same repo files.

## How to use

1. Run the Node.js backend server locally:
   - `npm install`
   - `npm start`
2. Open the app at `http://localhost:3000/`.
3. Use the normal flow:
   - open `cyberbull-landing.html`
   - create or log in to an account
   - admin users can sign in with `admin@cyberbull` and the admin secret
4. Admin users are taken to `admin-dashboard.html`.

## Notes

- This repo now supports server-side global accounts via `/api/*` and persistent storage in `db.json`.
- If the backend is unavailable, the frontend can still attempt Firebase profile storage when configured.
- Static GitHub Pages alone is no longer sufficient for the full backend-powered account flow unless you deploy the Node server or use Firebase.

## GitHub Pages Deployment

This project can be hosted as a static website on GitHub Pages.

1. Create a new repository on GitHub and push this project to the `main` branch.
2. Make sure the repository contains this workflow file: `.github/workflows/deploy-pages.yml`.
3. On every push to `main`, GitHub Actions will deploy the repository root as a static site.
4. The site URL will be:
   - `https://<your-github-username>.github.io/<repo-name>/`

Note: `index.html` is the default entry point, so the site root will load the login page. Use `cyberbull-games.html` for the game hub if desired.
