# TaskHub v2 - Claude Instructions

## Project Overview

TaskHub v2 is a task and project management app.

The app includes:

- Projects
- Tasks
- Kanban board
- Tickets
- Users
- Role-based access
- Email-based invitations

## Tech Stack

Frontend:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- Node.js
- Express.js
- Supabase
- Axios

Database/Auth:

- Supabase Auth
- Supabase Postgres
- Row Level Security where needed

## Folder Structure

- `client/` contains the Next.js frontend.
- `server/` contains the Node.js + Express backend.
- Frontend must call the backend API.
- Do not connect frontend directly to Supabase unless specifically requested.

## Coding Rules

- Use TypeScript where the project already uses it.
- Reuse existing patterns before adding new ones.
- Keep files small and focused.
- Avoid over-engineering.
- Do not introduce unnecessary packages.
- Use environment variables for secrets and config.
- Never hardcode API keys, tokens, service role keys, or credentials.

## Backend Rules

- Keep routes inside `server/routes`.
- Keep controllers/services separated if the project already follows that pattern.
- Validate request payloads.
- Return consistent JSON responses.
- Use proper HTTP status codes.
- Keep Supabase logic centralized where possible.

## Frontend Rules

- Use existing components and shadcn/ui patterns.
- Keep API calls inside service files.
- Use loading, empty, and error states.
- Use clean and responsive layouts.
- Avoid large component files when logic can be split.

## Auth Rules

- Protect private routes.
- Use Supabase JWT/session properly.
- Do not expose Supabase service role key to the browser.
- Keep role checks on the backend for protected actions.

## Response Rules

- Be concise.
- Prioritize code output over conversation
- No unnecessary commentary.
- Do not apologize or explain obvious changes.
- Explain only important decisions.
- Prefer direct code changes.
- Only output the code, no conversational filler
- When asked for a commit message, return only the commit message text.
- Avoid em dashes.

# Architecture Reminder

- Avoid monolithic files/components
- Split features into reusable components, hooks, services, and utils
- Keep components focused on a single responsibility
- Move business logic out of JSX
- Reuse existing UI components whenever possible
- Prefer scalable, maintainable structure over quick implementations
- Refactor large files automatically into smaller modules
