# Storage

The bytes go to a filesystem disk, the index goes to the database.

## The disk

```php
'storage' => [
    'disk' => env('SESSION_REPLAY_DISK', 'local'),
    'directory' => 'session-replay',
],
```

```
session-replay/
├── sessions/
│   └── 0b1c6a0e-…/          one folder per recording
│       ├── 000000.json.gz   one file per uploaded batch, in upload order
│       └── 000001.json.gz
└── assets/
    └── c8/
        └── c87f92ce….css.gz  a stylesheet, named by the SHA-256 of its content
```

Everything on the disk is gzip. A batch the browser compressed is stored as sent; one that arrived as plain JSON (an older browser, the final batch of a closing page) is compressed by the server, so the disk has one shape. Chunks and stylesheets are served with `Content-Encoding: gzip`, so the viewer's browser inflates them and PHP only streams.

Use a private disk. On S3 or R2:

```php
// config/filesystems.php
'replays' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('SESSION_REPLAY_BUCKET'),
    'visibility' => 'private',
],
```

```dotenv
SESSION_REPLAY_DISK=replays
```

The files are always read through the package's gated routes, never through a public URL.

## The tables

| Table | One row per | What it holds |
| --- | --- | --- |
| `replay_sessions` | recording | Who (`user_type`, `user_id`), workspace (`tenant_type`, `tenant_id`), `impersonator_id`, `properties`, first URL, user agent, device, viewport, counters (`page_count`, `event_count`, `chunk_count`, `bytes`, `error_count`, `rage_click_count`, `active_ms`), worst vitals (`lcp_ms`, `inp_ms`, `cls`), `pinned`, `truncated`, `started_at`, `last_activity_at`. The id is the UUID the browser generated. |
| `replay_chunks` | uploaded batch | `seq`, the file's `path`, `bytes`, `event_count`, first and last event time. Unique per recording and `seq`, which makes a retried upload harmless. |
| `replay_markers` | marker | `type`, `label`, `payload`, `at_ms`. This table is what lets a list filter without opening a file. |
| `replay_assets` | stylesheet | `hash`, `path`, stored and raw size, `last_seen_at`. Shared by every recording that references it. |

User and tenant keys are stored as strings, so integer, UUID and ULID keys all fit. Chunks and markers are removed with their recording by foreign key; deleting a `ReplaySession` model also deletes its folder on the disk.

## Multi-tenant apps

Tell the package which workspace a recording belongs to, and who is who:

```php
use Packstub\SessionReplay\Facades\SessionReplay;

SessionReplay::tenantUsing(fn ($request) => $request->user()?->currentTeam);
SessionReplay::impersonatorUsing(fn ($request) => session('impersonated_by'));
SessionReplay::propertiesUsing(fn ($request) => ['plan' => $request->user()?->currentTeam?->plan]);
SessionReplay::userUsing(fn ($request) => auth('customer')->user());
```

The closures run when the page renders, where the tenant is known (a subdomain, a path segment, a panel). Their results are signed into the token the recorder uploads with, so the ingest route needs no tenancy middleware.

In a **database-per-tenant** app, keep the four tables on the central connection, so operators see every workspace in one place and no tenant database grows with recordings:

```dotenv
SESSION_REPLAY_DB_CONNECTION=central
```

```php
'storage' => ['connection' => env('SESSION_REPLAY_DB_CONNECTION')],
'run_migrations' => false,
```

With `run_migrations` off, publish the migrations and run them where your central migrations live:

```bash
php artisan vendor:publish --tag=session-replay-migrations
```

The models and the migrations both follow `storage.connection`. Keep the disk central too.

## Sizes

A full snapshot of a server-rendered page is mostly stylesheet. Four things keep recordings small:

- **Stylesheets are stored once.** The recorder replaces every stylesheet of `size.dedupe_min_bytes` (2048) or more with a reference to the SHA-256 of its content. The server says which hashes it does not have, and the browser uploads only those. The server checks that the content matches the hash, so a stylesheet can never be stored under a name another recording points at. The player puts the text back before it plays. A deploy that changes your CSS simply adds one file.
- **Attributes the player never uses are dropped** (`size.strip_attributes`): `wire:*`, `x-*`, `@*`, `:*`, `ax-load*`, except `size.keep_attributes` (`x-cloak`).
- **Comments, scripts and head metadata are left out** of snapshots.
- **Mouse, scroll, media and input events are sampled** (`size.sampling`).

Stylesheet deduplication needs `crypto.subtle`, which browsers provide on HTTPS and on `localhost`. Without it stylesheets stay inside the snapshots and everything else works the same.

## Limits

| Key | Default | What happens at the limit |
| --- | --- | --- |
| `ingest.max_batch_kb` | 1536 | The browser splits a batch that compresses to more; the server answers 413 to a larger upload. A gzip batch that inflates to more than 40 times this is refused (422). |
| `ingest.max_session_mb` | 50 | The recording is marked `truncated` and the recorder is told to stop. |
| `ingest.max_asset_kb` | 1536 | The limit on a stylesheet as sent (compressed); it may inflate to eight times this. A larger one is refused and stays missing in the replay. |
| `ingest.throttle` | 240 | Uploads per minute, per signed-in person, or per recording for guests. Never per IP address. The recorder backs off on a 429. `null` turns it off. |

**PHP's upload limit.** Both defaults stay under PHP's default `upload_max_filesize` of `2M`; a file above PHP's limit never reaches the package. Typical batches are tens of kilobytes and a typical stylesheet compresses to well under 100 KB. If your `upload_max_filesize` or `post_max_size` is lower than 2M, lower both keys to match; to raise them, raise PHP's limits first.

## Pruning

```bash
php artisan session-replay:prune            # retention.days (default 30)
php artisan session-replay:prune --days=7
```

- Deletes recordings whose last activity is older than the window, one by one, with their files.
- Keeps pinned recordings: `$session->forceFill(['pinned' => true])->save()`.
- Deletes stylesheets that were last referenced before the window and before the oldest recording that is left (a pinned one included), so a kept recording never loses its styling.
- Refuses a window under one day.

Schedule it daily:

```php
Schedule::command('session-replay:prune')->daily();
```
