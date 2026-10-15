# Moonlit Grove — Phase 3 private friends (candidate, NOT accepted)

## Current gate

- Prior Phase 1/2 public Pages build remains the live release. This phase is isolated on a separate development branch until server permission tests pass.
- Dedicated Supabase project and Google OAuth provider **NOT yet configured**. Public accounts are OFF (the client deliberately displays Not open yet).
- Phase 3 database migration is **prepared, NOT applied**. Never run it on the existing `cass-health-lab` project.
- No media upload, location, group chat, public search, message storage, or auto-sync of Phase 1/2 data is added here.
- Site source contains zero admin/service secrets. The only future site configuration is project URL plus a **publishable** key.

## Feature implementation (pending backend verification)

- Verified Google OAuth identity, PKCE with random verifier and callback-state validation; short-lived session storage with refresh-token rotation and sign-out.
- One-time, random 192-bit invitation codes stored as SHA-256 digests, 7-day expiry and a limit of 5 active invitations per approved account.
- Manual trusted-adult bootstrap for first member. Sign-in alone does not create membership or open any data. The invitee must explicitly acknowledge age 13+ and redeem a valid code.
- Member names visible only to self and accepted friends. Friend removal, blocks, unblock, report-to-owner table; no public directory.
- Owner-only private records with database RLS. No access to invite hashes/reports from the Data API. Security-definer routines kept in unexposed `mg_private` schema behind invoker wrappers.

## Non-negotiable next gate before social access

1. Choose/create a second free Supabase project **within the user's chosen organization** after cost confirmation; keep health project untouched.
2. Enable Google OAuth for the dedicated project. Set the exact website URL in Supabase redirect allowlist; keep email/password disabled until an appropriate provider and confirmation path exist.
3. Apply the reviewed migration to the **new project only**. Check security advisors and ensure `mg_private` is not in exposed schemas.
4. Bootstrap the verified adult owner's first account ID via admin-only SQL (not a client-accessible public operation).
5. Create two real test users in separate browsers. Prove **denied**: unauthenticated reads, uninvited profile access, cross-user private records, invite-hash reads, forging invite issuer, tampering with own profile to become another identity. Prove **allowed**: valid invite accepted exactly once; friend names visible after acceptance; block cuts visibility; only owner can view own private record; report inaccessible to unauthorized users.
6. Run account flows on real iPhone Safari and installed PWA, Android, and offline without compromising Phase 1/2.
7. Confirm how reports will be privately reviewed by the project owner; do **not** claim round-the-clock moderation.
8. Tag stable checkpoint, run deployment and rollback rehearsal, then ask for acceptance.

## Age/privacy

Moonlit Grove accounts target ages 13+ only. The daughter who has not yet turned 13 must use the local-only features until eligible. Checkbox age affirmation is NOT age verification; that limitation must be considered in the rollout decision. No real names, birth dates, locations, or children's photos are needed for Phase 3.

## Operational notes

- Default Supabase SMTP does not send emails to arbitrary non-team recipients. Google OAuth requires separate Google Cloud/Supabase provider setup; it is not activated by this commit.
- No public signup/listing or friend access is enabled in this candidate.
- Do not put invites, access/refresh tokens, service-role keys, personal data, or Google OAuth client secrets in public GitHub.
- Frontend local data stays separate from authenticated backend; data sync is a future gated decision.
