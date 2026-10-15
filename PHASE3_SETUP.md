# Phase 3 account setup — dedicated Supabase only

**Hold point:** The backend has not been provisioned. First confirm with the owner which Supabase organization will hold Moonlit Grove and the exact zero-cost project price. The existing `cass-health-lab` project and its data are out of scope.

1. Confirm the destination organization and $0 free project cost. Create a new dedicated Supabase project named `moonlit-grove` in the chosen region, **not** the health project.
2. Configure Google OAuth web client and allowed redirects for `https://zy65h95wjn-netizen.github.io/moonlit-grove/`. Follow current official docs; keep Google Client Secret only in Supabase provider settings. If Google login is infeasible, stop and reassess before launching; do not disable account verification to work around missing SMTP.
3. Ensure the Supabase `mg_private` schema is NOT part of exposed schemas (`public` only is sufficient), and apply SQL from `supabase/migrations/001_phase3_security.sql` after review.
4. Review Supabase security advisors. Seed one adult guardian's own verified auth account into `public.mg_members` **by server-side admin SQL**, with a non-identifying display name. No automatic first-user-is-admin shortcut exists.
5. Populate `src/account-config.js` with just the project URL and sb_publishable key. Never use an `sb_secret_...` or `service_role` key in GitHub Pages.
6. Run the two-user RLS and invitation tests before deploying the Friends tab live. Keep Pages pointing at the Phase 2 release until all pass.
7. No subscription, SMS, paid SMTP, custom domain, or card spending permitted. Backend may pause if unused, and the feature must fail closed.

## Rollback

- GitHub: restore Pages to the prior pinned Phase 2 commit / branch, retaining state in existing IndexedDB stores. Do not rewrite saved Phase 1/2 schema.
- Database: Do **not** drop any tables as a casual rollback. Disable account UI/config first; preserve security database state and backups for deliberate migration planning.
