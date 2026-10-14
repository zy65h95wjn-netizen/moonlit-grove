# Moonlit Grove Phase 2 candidate — functional-first

## Included
- Four local creative studios: crochet, recipes, hair/makeup boards, sports sessions. Each supports add/edit/complete/delete and multi-line notes.
- Daily prompt with one claim per local day; two solo games (trivia and word scramble).
- Moonseed collection rewards with progress tracked on device.
- Separate persistent IndexedDB record for Phase 2, leaving Phase 1 `current` data intact.
- Export/import Phase 2 data with validation; no network calls, ads, accounts, or data sharing.

## Preserved
- Existing clubhouse and Phase 1 storage.
- No changes to Phase 3–9 commitments or to strict $0 requirement.
- Existing `phase1-candidate` GitHub branch is rollback baseline until tested.

## Gate
1. Create/edit/delete each studio item; close/reopen, confirm persistence.
2. Claim one daily moonseed, refresh; cannot claim again.
3. Answer trivia and word scramble; rewards cannot be farmed on same day.
4. Export/restore a Phase 2 backup without changing clubhouse decor.
5. Verify motion toggle, offline after first load, iPhone standalone, Android/browser layout.
6. Verify stored user text is escaped, invalid imports rejected, no external calls.

**Status: candidate; NOT accepted until genuine iPhone persistent/offline tests.**
