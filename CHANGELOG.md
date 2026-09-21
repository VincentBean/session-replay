# Changelog

All notable changes to `packstub/session-replay` are documented here.

## Unreleased

First version.

### Added

- **Recorder.** `@sessionReplay` before `</body>` records the page with rrweb 2: one recording per tab, continued across page loads until the tab sits idle (`idle_timeout`), a sticky sampling decision (`sample_rate`), `SessionReplay::recordWhen()`, `guests`, `except`, opt-in consent (`window.SessionReplay.consent(true)`), optional Global Privacy Control. A recording belongs to one person in one workspace: a tab that changes person, workspace or impersonator starts a new one, and the server refuses an upload that crosses either line.
- **Privacy defaults.** Every input masked (passwords always), `data-replay-mask`, `data-replay-block`, `data-replay-ignore`, `privacy.mask_all_text` for layout-only recordings, no IP address stored.
- **Markers.** Uncaught errors and unhandled rejections, `console.error`, failed Livewire requests, LCP/INP/CLS, rage clicks, page views (`wire:navigate` included) and your own (`SessionReplay.mark()`), indexed in `replay_markers` and drawn on the player's timeline. A rage click is labelled by the control that was clicked: `button "Save changes"`, never the text of a link or a cell.
- **Small recordings.** Stylesheets are stored once per SHA-256 of their content instead of inside every snapshot, attributes the player never uses (`wire:snapshot`, `wire:effects`, Alpine expressions) are dropped, comments and scripts are left out, batches are gzipped in the browser and stored and served as sent. `x-cloak` and Livewire's `wire:loading*`, `wire:offline*` and `wire:dirty*` stay, because stylesheets select on them (`size.keep_attributes` takes `prefix*` too).
- **Ingest.** Identity comes from a token signed when the page rendered (person, workspace, impersonator, properties), so the endpoint needs no session and no CSRF token; per-person throttle, batch and recording size limits, idempotent retries.
- **Storage.** Gzip chunks on any filesystem disk, the index in four tables on a configurable connection, `session-replay:prune` with `retention.days` and pinned recordings.
- **Watching.** `<x-session-replay::player>` and a built-in list and player behind the `viewSessionReplay` gate, which receives the recording and guards every data route; only the local environment is let in until the app defines it. `session-replay:install` publishes the provider with the gate.
- **Log context.** The running recording's id and URL in Laravel's `Context`, so log lines and error reports link to the replay.
- **Cached pages.** `ingest.token_days` (7) is how long the token a page was rendered with is accepted, and `ingest.guest_tokens_expire=false` lets a token that names nobody (no person, no workspace, no impersonator) live as long as the page cache that holds it.
- **Lists that follow the gate.** `SessionReplay::visibleUsing(fn (Builder $query, $viewer) => ...)` keeps recordings the gate would refuse out of lists, in SQL; `SessionReplay::visibleTo($query)` applies it on your own page.
- **Languages.** The viewer and the player in English, German, Spanish, Romanian and Russian, following the app's locale (`vendor:publish --tag=session-replay-translations`).
- `HasSessionReplays`, `ReplaySessionStarted`, `SessionReplay::tenantUsing()`, `impersonatorUsing()`, `propertiesUsing()`, `userUsing()`, `urlUsing()`.
