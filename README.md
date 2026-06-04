# CyberBull Student Admin Dashboard

This project uses HTML, CSS, and JavaScript with `localStorage` to manage user and admin data locally.

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

- Student accounts are stored under `localStorage` keys like `user_{domain}_{username}`.
- `create-account.html` now stores rich user records with `xp`, `level`, `achievements`, `sessions`, `goals`, and `isAdmin`.
- Student login uses `currentUser`, `currentUserKey`, and `currentSchool` to keep session state.
- Admin accounts created with the admin secret are marked as `isAdmin` and are redirected to the admin dashboard.
- The student `home.html` page blocks admin sessions and redirects them to `admin-dashboard.html`.

## How to use

1. Open `landing.html` in a browser.
2. Create a student account using `create-account.html`.
3. Log in through `domain.html` + `index.html`.
4. For admin access, create a user with the admin secret in `create-account.html` or use the special `admin@cyberbull` login route.
5. Admin users are taken to `admin-dashboard.html`.

## Notes

- This is a local, client-side demo with no backend.
- Data is stored in the browser's `localStorage`.
- If you want, I can also add a simple test harness or clean up the unused `admin-login.html` route.

## GitHub Pages Deployment

This project can be hosted as a static website on GitHub Pages.

1. Create a new repository on GitHub and push this project to the `main` branch.
2. Make sure the repository contains this workflow file: `.github/workflows/deploy-pages.yml`.
3. On every push to `main`, GitHub Actions will deploy the repository root as a static site.
4. The site URL will be:
   - `https://<your-github-username>.github.io/<repo-name>/`

Note: `index.html` is the default entry point, so the site root will load the login page. Use `cyberbull-games.html` for the game hub if desired.
