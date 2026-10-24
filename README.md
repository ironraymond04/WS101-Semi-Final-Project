# Campus Lost and Found

A Next.js App Router application backed by hosted Supabase (Postgres, Auth, Storage, and RLS).

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `CAMPUS_EMAIL_DOMAINS` as a comma-separated list of exact campus-owned email domains, without `@`.
3. Apply `supabase/schema.sql` to a **new/empty** Supabase project using the Supabase SQL Editor.
4. Add the same approved domain(s) to the database:

   ```sql
   insert into public.campus_email_domains(domain)
   values ('campus.example.edu');
   ```

5. Create the first campus owner/admin account only after configuring the allowed email domain. After its email is verified and its student profile exists, promote it through the Supabase SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'owner@campus.example.edu';
   ```

   This one-time bootstrap is performed outside public signup. Later admins are appointed by an existing admin in the app.
6. Configure Supabase Auth email confirmation for the project. New public accounts are always students; signup remains disabled in the application until `CAMPUS_EMAIL_DOMAINS` is set.
7. Start the app with `npm run dev`.

Never add a Supabase `service_role` key to application environment variables or client/server app code. The app uses the authenticated user's session and the public anon key; database and Storage RLS enforce access.

## Existing Supabase projects

The current `schema.sql` is a fresh-project schema, not an in-place migration from the former `items`/`claims` schema. Back up an existing project and prepare a data-preserving migration before applying the new schema; do not run the fresh schema over a populated database.

## Policies awaiting campus decisions

The campus email domain(s), pickup deadline, special-item categories/handling, archive retention period, and email delivery provider remain unconfigured. The app must not infer these policies. The email event requirements and privacy limits are documented in `.scratch/lost-and-found/spec.md`; actual email delivery must be wired after the campus chooses a provider.

## Commands

- `npm run dev` — development server
- `npm test` — Vitest tests
- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript check
- `npm run build` — production build
