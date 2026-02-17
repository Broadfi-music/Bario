# Contributing to Bario

## Quick Start

```bash
git clone <REPO_URL>
cd bario
npm install
npm run dev   # http://localhost:8080
```

## Code Style

- **TypeScript** — strict mode, no `any` unless unavoidable
- **React** — functional components only, hooks for state
- **Tailwind CSS** — use semantic design tokens from `index.css`, never hardcode colors
- **Imports** — use `@/` path alias (e.g., `@/components/ui/button`)
- **Components** — small, focused, single responsibility
- **Naming** — PascalCase for components, camelCase for hooks/utilities

## Project Structure for Developers

### Frontend Developer
Start here:
- `src/pages/` — route components, one per page
- `src/components/` — reusable UI components
- `src/components/ui/` — shadcn/ui primitives (don't modify unless adding variants)
- `src/index.css` — design tokens and global styles
- `tailwind.config.ts` — theme configuration

### Backend Developer
Start here:
- `supabase/functions/` — all serverless edge functions (Deno/TypeScript)
- `supabase/migrations/` — SQL migrations (read-only, applied automatically)
- `src/integrations/supabase/types.ts` — auto-generated DB types (read-only)
- See [supabase/functions/README.md](./supabase/functions/README.md) for API reference

### Full-Stack Developer
- `src/hooks/` — custom hooks that bridge frontend ↔ backend
- `src/contexts/` — global state (auth, audio player)
- `src/lib/` — shared utilities

## Files You Should NOT Edit

| File | Reason |
|------|--------|
| `src/integrations/supabase/client.ts` | Auto-generated backend client |
| `src/integrations/supabase/types.ts` | Auto-generated from database schema |
| `.env` | Auto-managed environment variables |
| `supabase/config.toml` | Auto-managed backend configuration |

## Adding a New Page

1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Navbar.tsx` if needed

## Adding a New Edge Function

1. Create `supabase/functions/my-function/index.ts`
2. Follow existing patterns for CORS headers and auth checks
3. Functions deploy automatically on push
4. Document in `supabase/functions/README.md`

## PR Guidelines

- Keep PRs focused on a single feature or fix
- Test on mobile viewport (390×844) as well as desktop
- Don't break existing functionality — the app has no automated tests yet
- Update documentation if you add new routes, API endpoints, or tables
