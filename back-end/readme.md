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

3. Run the dev server:
   - `npm run dev`

You can then:
- `POST /api/auth/signup` – create a Supabase user (email/password).
- `POST /api/auth/login` – sign in and receive:
  - `user`
  - `token` (Supabase `access_token`, for `Authorization: Bearer <token>`)
  - `session`
- Use the `Authorization: Bearer <token>` header to:
  - `GET /api/users/me` – fetch the current authenticated user.
  - `POST /api/items` – create a listing (stored in the `items` table in Supabase).
- `GET /api/items` – browse listings with simple query filters (reads from Supabase).
