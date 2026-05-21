# Server Rules

This folder contains the Node.js + Express (v5) backend.

Structure:

- Entry: `src/server.js` (mounted via `src/app.js`).
- Routes: `src/routes/` (one file per resource).
- Controllers: `src/controllers/`.
- Services: `src/services/`.
- Middlewares: `src/middlewares/`.
- Supabase migrations: `supabase/migrations/`.

Rules:

- Use Express routes and controllers.
- Use Supabase server client.
- Validate request bodies.
- Keep auth middleware reusable.
- Never expose service role keys to the frontend.
- Return consistent JSON responses.
- Keep route files focused by resource.

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
