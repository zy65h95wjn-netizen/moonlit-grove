# Moonlit Grove — Phase 1 working prototype

A personalizable, local-only, cross-platform PWA. Implements **only Phase 1**, based on the approved October 14, 2026 blueprint. No accounts, chat, location, tracking, backend, paid services, or unapproved future-phase features.

## What works

- Illustrated, responsive woodland clubhouse with gently animated fireflies and mist (respects OS reduced-motion preference and in-app motion toggle).
- Five reusable themed decorations; tap **Decorate**, select a treasure, and tap the woodland to place it. Drag placed decorations or move selected items using the arrow controls; remove items at any time. 12-decoration limit.
- Autosave of complete decoration arrangement and motion preference in the browser's IndexedDB. Clear status indicates saving, saved, or storage failure; never silently claims a failed save succeeded.
- Export JSON backup, import validated backup, and reset with confirmation. Imports and resets only update the UI after the new state is successfully committed.
- PWA manifest and scoped offline service worker with local assets only. No network needed after caching. Standalone app on iPhone Home Screen / Android.
- No external fonts, APIs, images, analytics, or requests.

## How to preview locally

Requires a local HTTP server for ES modules and service worker. From the `moonlit-grove-phase1` directory:

```shell
python -m http.server 8000
```

Open `http://localhost:8000/` on your computer. To install on iPhone/Android, publish the contents as a static HTTPS website to a *dedicated* GitHub repository; do not upload any private personal data. This Phase 1 candidate is staged for GitHub Pages testing and is not yet an accepted milestone.

## iPhone-specific testing

After deploying on HTTPS, open the page in Safari, choose **Share → Add to Home Screen → Add**, then open the app **from its Home Screen icon** and personalize it there. The installed app and Safari can hold **separate local storage**. Save an exported JSON backup to Files if you want recovery or transfer; clearing website data or uninstalling can remove device-saved state.

## Milestone test gate

1. Open in Safari and as an installed PWA; verify visual layout, labels, buttons and safe areas.
2. Add, move, remove a decoration; close and reopen the installed PWA to verify persistence.
3. Disable animations and verify the setting persists; also test OS Reduce Motion.
4. Export, reset, import; verify the initial arrangement returns. Reject an invalid/oversized backup without changing the arrangement.
5. Reload after first load with network disconnected and ensure the cached app opens.
6. Test smaller phones, Android, and desktop; check for horizontal overflow.
7. Disable IndexedDB and ensure the UI explicitly says changes are not saved.
8. Rehearse restoring a tagged known-good code version before any public publication.

Automated browser coverage is in `tests/test_phase1.py`. True iOS Home Screen behavior requires a real iPhone and cannot be fully represented by desktop emulation.

## Security/privacy boundaries

Content saved locally on-device is *not* encrypted by the app or backed up automatically. Anyone with access to the unlocked device/browser profile can view it. No usernames, photos, email addresses, location, credentials, or friend information are collected. Exported files should be kept private. Published GitHub Pages source and assets will be world-readable; private content must never be committed. Phase 3 will be a separate security gate before any social functionality.

## Rollback and delivery

The initial repository commit remains the rollback baseline. The ZIP of the Phase 1 candidate is also a backup. On acceptance, create a separate `moonlit-grove` repository, release from an accepted commit/tag and preserve a known-good baseline. The service-worker cache version must be advanced when changing cached assets; replacing files without bumping it can leave users on old code.