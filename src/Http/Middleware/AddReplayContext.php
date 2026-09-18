<?php

namespace Packstub\SessionReplay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Packstub\SessionReplay\Facades\SessionReplay;
use Packstub\SessionReplay\Models\ReplaySession;
use Symfony\Component\HttpFoundation\Response;

/**
 * While a recording runs the browser sends its id in a plain cookie. Put it,
 * and where to watch it, into Laravel's Context, so every log line, queued
 * job and error report of this request points at the replay.
 */
class AddReplayContext
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('session-replay.enabled', true) && config('session-replay.context.enabled', true)) {
            // Read before cookie decryption runs: the recorder writes it in the clear.
            $id = $request->cookies->get((string) config('session-replay.context.cookie', 'session_replay_id'));

            if (is_string($id) && Str::isUuid($id)) {
                Context::add('session_replay', $id);

                // An unsaved model is enough to build the link; no query on the hot path.
                $url = SessionReplay::urlFor((new ReplaySession)->forceFill(['id' => $id]));

                if ($url !== null) {
                    Context::add('session_replay_url', $url);
                }
            }
        }

        return $next($request);
    }
}
