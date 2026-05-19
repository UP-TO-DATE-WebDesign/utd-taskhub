# TaskHub v2 - Client

Frontend for TaskHub v2, a task and project management app.

## Features

- Projects with members and role-based permissions
- Tasks with rich-text descriptions, comments, attachments, and activity history
- Kanban board with drag-and-drop
- Sprints and capacity planning
- Tickets
- Users, profiles, and admin tools
- Email-based invitations
- Real-time notifications
- Dashboard with charts and reports

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui (Radix primitives)
- Redux Toolkit
- React Router v7
- Lexical (rich text)
- dnd-kit (drag and drop)
- Recharts
- Sentry

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env` with backend URL:

```
VITE_API_URL=http://localhost:5050/api/v1
VITE_SENTRY_DSN=
VITE_SUPPORT_EMAIL=
```

Run dev server:

```bash
npm run dev
```

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - type-check and build for production
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Project Structure

```
client/
├── src/
│   ├── assets/              static assets
│   ├── components/          UI by feature
│   │   ├── auth-components/
│   │   ├── projects/
│   │   ├── project-settings/
│   │   ├── sprints/
│   │   ├── task-page/
│   │   ├── tasks/
│   │   ├── tickets/
│   │   ├── users/
│   │   ├── workspace-settings/
│   │   ├── ui/              shadcn/ui primitives
│   │   ├── PermissionGate.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RoleGuard.tsx
│   ├── context/             React context providers
│   ├── data/                static data and constants
│   ├── hooks/               reusable hooks
│   ├── layouts/             route layouts
│   ├── lib/                 api client, utils
│   ├── pages/               route components
│   │   └── admin/
│   ├── services/            API service modules (one per resource)
│   ├── types/               shared TS types
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
└── package.json
```

## Architecture Notes

- API calls go through service files; no direct Supabase calls from the client.
- Components follow shadcn/ui patterns with Radix primitives.
- State managed via Redux Toolkit.
- All views include loading, empty, and error states.

## Related

- `../server` - Express + Supabase backend
