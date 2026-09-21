# Changelog

All notable changes to `packstub/session-replay` are documented here.

## Unreleased

First version, not tagged yet.

### Fixed

- A tab whose person changed (a guest who signs in, a sign-out, an account switch) starts a new recording on that page load. Before, the tab kept its recording id, the server refused the batches as someone else's, and nothing was recorded until the tab had been idle.

- A page left within the first seconds is in the replay: its snapshot uploads 0.8 s after the page starts recording instead of with the first interval. Before, it rode on the unload request, which browsers cancel above 64 KB.
- Uploads no longer fail with "database is locked" on SQLite with the database cache when a page sends two batches at once: the ingest throttle retries its counter.

### Added

- **Recorder.** `@sessionReplay` before `</body>` records the page with rrweb 2: one recording per tab, continued across page loads until the tab sits idle (`idle_timeout`), a sticky sampling decision (`sample_rate`), `SessionReplay::recordWhen()`, `guests`, `except`, opt-in consent (`window.SessionReplay.consent(true)`), optional Global Privacy Control.
- **Privacy defaults.** Every input masked (passwords always), `data-replay-mask`, `data-replay-block`, `data-replay-ignore`, `privacy.mask_all_text` for layout-only recordings, no IP address stored.
- **Markers.** Uncaught errors and unhandled rejections, `console.error`, failed Livewire requests, LCP/INP/CLS, rage clicks, page views (`wire:navigate` included) and your own (`SessionReplay.mark()`), indexed in `replay_markers` and drawn on the player's timeline.
- **Small recordings.** Stylesheets are stored once per SHA-256 of their content instead of inside every snapshot, attributes the player never uses (`wire:snapshot`, `wire:effects`, Alpine expressions) are dropped, comments and scripts are left out, batches are gzipped in the browser and stored and served as sent.
- **Ingest.** Identity comes from a token signed when the page rendered (person, workspace, impersonator, properties), so the endpoint needs no session and no CSRF token; per-person throttle, batch and recording size limits, idempotent retries.
- **Storage.** Gzip chunks on any filesystem disk, the index in four tables on a configurable connection, `session-replay:prune` with `retention.days` and pinned recordings.
- **Watching.** `<x-session-replay::player>` and a built-in list and player behind the `viewSessionReplay` gate, which receives the recording and guards every data route; only the local environment is let in until the app defines it. `session-replay:install` publishes the provider with the gate.
- **Log context.** The running recording's id and URL in Laravel's `Context`, so log lines and error reports link to the replay.
- `HasSessionReplays`, `ReplaySessionStarted`, `SessionReplay::tenantUsing()`, `impersonatorUsing()`, `propertiesUsing()`, `userUsing()`, `urlUsing()`.
