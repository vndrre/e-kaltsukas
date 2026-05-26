# Back-End

Initial backend foundation for a mobile second-hand marketplace app.

Current stack:
- Node.js
- Express
- Supabase (PostgreSQL + Auth)

### Getting started

1. Install dependencies:
   - `npm install`

2. Create a `.env` file (see `.env.example`) and set:
   - `PORT` (optional, default 5000)
   - `CORS_ORIGIN`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (backend only, recommended for profile sync)
   - `RESEND_API_KEY` (replace `re_xxxxxxxxx` with your real Resend API key)
   - `RESEND_FROM_EMAIL` (default: `onboarding@resend.dev`)
   - `AUTH_EMAIL_REDIRECT_URL` (default: `http://localhost:8081/login?verified=1`)

3. Run the dev server:
   - `npm run dev`

You can then:
- `POST /api/auth/signup` – create a Supabase user (`name`, `email`, `password`).
- `POST /api/auth/login` – sign in and receive:
  - `user`
  - `token` (Supabase `access_token`, for `Authorization: Bearer <token>`)
  - `refreshToken`
  - `expiresAt`
  - `session`
- `POST /api/auth/refresh` – exchange a valid `refreshToken` for a fresh session.
- Use the `Authorization: Bearer <token>` header to:
  - `GET /api/users/me` – fetch the current authenticated user.
  - `POST /api/items` – create a listing (stored in the `items` table in Supabase).
- `GET /api/items` – browse listings with simple query filters (reads from Supabase).

### Resend email test

Set `RESEND_API_KEY` in `.env`, then run:
- `npm run email:test`

By default, the test sends to `aleppik7@gmail.com`. To override:
- `RESEND_TEST_TO=you@example.com npm run email:test`

This Resend API helper sends emails from the backend app. Supabase Auth confirmation
emails are configured separately in the Supabase dashboard using custom SMTP.

### Supabase auth redirects

For local Expo web, set:
- `AUTH_EMAIL_REDIRECT_URL=http://localhost:8081/login?verified=1`

In Supabase Dashboard > Authentication > URL Configuration:
- Set Site URL to your frontend URL, for example `http://localhost:8081`
- Add `http://localhost:8081/login` or `http://localhost:8081/**` to Redirect URLs

Old confirmation emails can still show `otp_expired`; request a fresh confirmation
email after changing the redirect settings.
