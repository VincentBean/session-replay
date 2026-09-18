# Error tracking

While a recording runs, every log line and error report of that person's requests can point at the replay.

## How it works

1. The recorder writes the recording's id into a plain cookie (`context.cookie`, default `session_replay_id`; `SameSite=Lax`, `Secure` on HTTPS, expires with `idle_timeout`). It holds a UUID and nothing else.
2. The browser sends the cookie with every request to your app: page loads, Livewire updates, `fetch` calls.
3. `AddReplayContext`, a global middleware the package registers, reads it, checks that it is a UUID and adds two keys to Laravel's `Context`:

| Key | Value |
| --- | --- |
| `session_replay` | The recording's id |
| `session_replay_url` | Where to watch it: the built-in viewer's page, or what `SessionReplay::urlUsing()` returns. Left out when there is nowhere to link to. |

The middleware runs no query.

## Where it shows up

Laravel attaches `Context` to everything it logs, and carries it into queued jobs dispatched during the request:

```
[2026-09-18 10:57:12] production.ERROR: Undefined array key "total"
{"exception":"…"} {"session_replay":"0b1c6a0e-…","session_replay_url":"https://app.test/session-replay/0b1c6a0e-…"}
```

Error trackers that read Laravel's `Context`, such as Flare, Sentry and Nightwatch, receive the two keys as context on the report, next to whatever else your app adds. From a report, open `session_replay_url` and add `?t=` with the number of seconds into the recording to land near the moment.

In your own code:

```php
use Illuminate\Support\Facades\Context;

$replay = Context::get('session_replay_url');
```

## Link to your own page

When replays are watched somewhere other than the built-in viewer:

```php
use Packstub\SessionReplay\Facades\SessionReplay;
use Packstub\SessionReplay\Models\ReplaySession;

SessionReplay::urlUsing(fn (ReplaySession $session): string => route('support.replays.show', $session->id));
```

For the context the closure receives an unsaved model that carries only the id, so build the URL from `$session->id` and do not read other attributes there.

## Turning it off

```php
'context' => ['enabled' => false],
```

No cookie is written and the middleware is not registered. Rename the cookie with `context.cookie`. If your app lists cookies for a consent banner, this one is functional: it identifies a recording, not a person, and is only set while recording runs.
