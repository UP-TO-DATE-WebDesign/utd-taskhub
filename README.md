# TaskHub v2

A task and project management app with Kanban boards, tickets, sprints, role-based access, and email invitations.

## Features

- Projects and tasks
- Kanban board (drag and drop)
- Tickets and task types
- Sprints
- Users, roles, and role-based access control
- Email-based invitations
- Google OAuth sign-in (via Supabase)
- Notifications and due-date reminders
- Admin reporting and system logs

## Tech Stack

**Frontend** (`client/`)

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix primitives), Mantine, Headless UI, Emotion
- Redux Toolkit + SWR
- React Router v7
- dnd-kit (Kanban), Recharts, Lexical, Sentry

**Backend** (`server/`)

- Node.js + Express 5
- Supabase (Postgres + Auth)
- helmet, cors, express-rate-limit, morgan
- nodemailer / mailtrap (email)
- ws (websockets), Sentry

## Project Structure

```
client/        Vite + React frontend
  src/
    components/  hooks/  services/  pages/  layouts/  context/  lib/  types/
server/        Node + Express backend
  src/
    routes/  controllers/  services/  middlewares/  config/  jobs/  scripts/  utils/
postman/       API collection
```

The frontend calls the backend API. The frontend does not connect to Supabase directly.

## Prerequisites

- Node.js 18+
- A Supabase project (URL, anon key, secret key)

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY, COOKIE_SECRET
npm install
npm run dev
```

API runs on `http://localhost:5050`.

### 2. Frontend

```bash
cd client
cp .env.example .env
# set VITE_API_URL=http://localhost:5050
npm install
npm run dev
```

App runs on `http://localhost:5173`.

## Environment Variables

**Server** (`server/.env`)

| Variable | Description |
| --- | --- |
| `PORT` | API port (default 5050) |
| `APP_URL` | Frontend URL (default http://localhost:5173) |
| `API_URL` | API base URL (default http://localhost:5050) |
| `COOKIE_SECRET` | Secret used to sign HTTP-only cookies (OAuth PKCE) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Supabase service role key (server only) |
| `SUPABASE_AVATAR_BUCKET` | Storage bucket for avatars (default `avatars`) |
| `SENTRY_DSN` | Optional Sentry DSN |

**Client** (`client/.env`)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend API URL |
| `VITE_SENTRY_DSN` | Optional Sentry DSN |

Never commit real keys. Do not expose the Supabase secret key to the browser.

### Google Sign-In

Enable the Google provider in Supabase Dashboard > Authentication > Providers, then add `${API_URL}/api/v1/auth/google/callback` and `${APP_URL}/auth/callback` to the Supabase redirect URLs.

## Scripts

**Server**

| Command | Description |
| --- | --- |
| `npm run dev` | Start with nodemon |
| `npm start` | Start production server |
| `npm test` | Run node tests |
| `npm run seed` | Seed the database |
| `npm run seed:reset` | Reset and reseed |

**Client**

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build |
| `npm run preview` | Preview the build |
| `npm run lint` | Run ESLint |

## API

Routes live in `server/src/routes` under the `/api/v1` prefix. Import the Postman collection in `postman/` for the full request set.
