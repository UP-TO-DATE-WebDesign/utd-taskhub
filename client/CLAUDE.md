# Client Rules

This folder contains the Vite + React 19 frontend.

Rules:

- Use TypeScript.
- Use Tailwind CSS v4 with shadcn/ui (Radix). Mantine, Headless UI, and Emotion are also present; prefer shadcn/ui for new work unless the surrounding component already uses another library.
- State and data: Redux Toolkit and SWR (via the `useApiSWR` hook) are both in use. Prefer SWR for new server-data reads.
- API requests must go through service files in `src/services/`.
- Use `VITE_API_URL` for the backend URL (see `.env` / `VITE_*` vars).
- Do not call Supabase directly unless requested.
- Keep UI clean, responsive, and accessible.
- Include loading, empty, and error states.

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
