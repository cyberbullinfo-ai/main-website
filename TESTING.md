# CyberBull Student Manual Test Checklist

## Prerequisites

- Open the project files in a browser with local file access.
- Start from `landing.html`.

## Student workflow

1. Open `landing.html`.
2. Click `Account aanmaken` and create a new student account:
   - Domain: `school.smartschool.be`
   - Username: `student1`
   - Password: `password123`
3. Confirm the account is created and the page redirects.
4. Click `Inloggen` or go to `domain.html`.
5. Enter the same domain and login credentials.
6. Confirm the app redirects to `home.html`.
7. Verify the student dashboard loads and you can add a goal, use the timer, and use the background controls.

## Admin workflow

1. Open `landing.html`.
2. Click `Account aanmaken` and create an admin account with a valid Smartschool domain and the admin code:
   - Domain: `school.smartschool.be`
   - Username: `adminuser`
   - Password: `adminpass`
   - Admin code: `letmein-admin`
3. Confirm the app redirects to `admin-dashboard.html`.
4. In the admin dashboard, verify:
   - Account Manager lists users and allows `Inspect`, `Suspend`, `Reset PW`, and `Delete`.
   - Statistics Overview shows totals and domain counts.
   - User Inspector opens a detailed profile when you click `Inspect`.
   - Admin Tools can add announcements, challenges, achievements, and XP rewards.
5. Verify logout returns to `landing.html` and admin pages cannot be accessed without login.

## Special admin login route

1. Open `domain.html`.
2. Enter `admin@cyberbull` and click `Volgende`.
3. On `index.html`, enter:
   - Username: `admin`
   - Password: `Otis&Samuel`
4. Confirm the app redirects to `admin-dashboard.html`.

## Notes

- All user data is stored in the browser's `localStorage`.
- Admin users are marked with `isAdmin` and are redirected to `admin-dashboard.html`.
- Normal students are blocked from admin pages.
