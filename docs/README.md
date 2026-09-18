# Session Replay for Laravel

Record what a person did in the browser with rrweb, keep the recording on your own disk and database, and watch it inside your own app behind a gate you define. One Blade directive records; nothing has to be built or published. Free and open source (MIT).

- Repository: [github.com/packstub/session-replay](https://github.com/packstub/session-replay)
- Packagist: [packstub/session-replay](https://packagist.org/packages/packstub/session-replay)
- Support: [GitHub issues](https://github.com/packstub/session-replay/issues)

In a Filament panel, [Filament Session Replay](https://packstub.dev/docs/filament-session-replay) puts the sessions, the player and the masking macros on top of this package.

## What you get

| Feature | What it means for you |
| --- | --- |
| **One directive** | `@sessionReplay` before `</body>` records the page. The recorder and the player are served by a package route, versioned and cached for a year. |
| **Private by default** | Every input masked, passwords always, no IP address, guests off, scripts never replayed. `data-replay-mask`, `data-replay-block`, `data-replay-ignore` and `privacy.mask_all_text` for the rest. Opt-in consent and Global Privacy Control are one setting each. |
| **Your storage** | Gzip chunks on any filesystem disk (local, S3, R2), the index in four tables on a connection you choose. No metering, no second service. |
| **Markers** | Errors, console output, failed Livewire requests, web vitals, rage clicks, page views and your own moments are drawn on the timeline and indexed in `replay_markers`, so a list filters on them without opening a recording. |
| **Small recordings** | Stylesheets stored once per SHA-256 of their content, Livewire and Alpine attributes dropped, comments and scripts left out, batches gzipped in the browser and stored as sent. |
| **A gate, down to the file** | `viewSessionReplay` is asked for the list and, with the recording, for the player, the manifest, every chunk and every stylesheet. Undefined means local environment only. |
| **Identity without a session** | Who is signed in, the workspace and an impersonator are signed into a token when the page renders. Ingest trusts only that, so it works with any guard, any tenancy setup and no CSRF token. |
| **A link in every log line** | The running recording's id and URL are added to Laravel's `Context`. |

## Guides

| Guide | What it covers |
| --- | --- |
| [Installation](installation.md) | Requirements, the install command, the directive, the gate, the scheduler, the routes |
| [Recording](recording.md) | The directive and its options, who is recorded, sessions and sampling, markers, the browser API, Livewire, CSP, known limits |
| [Privacy](privacy.md) | What is and is not recorded, masking and blocking, consent, guests, retention, wording for a privacy policy |
| [Watching replays](watching.md) | The `viewSessionReplay` gate, the built-in viewer, the player component, links, models and scopes |
| [Storage](storage.md) | Disk layout, the four tables, multi-tenant apps, sizes and limits, pruning, S3 |
| [Error tracking](error-tracking.md) | The recording in Laravel's `Context`, and where it shows up |
| [Configuration](configuration.md) | Every key in `config/session-replay.php` |
