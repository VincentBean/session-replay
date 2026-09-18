<?php

namespace Packstub\SessionReplay\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Packstub\SessionReplay\Models\ReplaySession;

/** The built-in pages: a list and a player. Deliberately small; a panel does more. */
class ViewerController
{
    /** GET {path} */
    public function index(Request $request): View
    {
        $sessions = ReplaySession::query()
            ->with('user')
            ->when($request->filled('user'), fn ($query) => $query->where('user_id', (string) $request->query('user')))
            ->when($request->boolean('errors'), fn ($query) => $query->withErrors())
            ->when($this->date($request->query('from')), fn ($query, Carbon $from) => $query->where('started_at', '>=', $from->startOfDay()))
            ->when($this->date($request->query('to')), fn ($query, Carbon $to) => $query->where('started_at', '<=', $to->endOfDay()))
            ->latest('started_at')
            ->paginate((int) config('session-replay.viewer.per_page', 25))
            ->withQueryString();

        return view('session-replay::viewer.index', [
            'sessions' => $sessions,
            'filters' => $request->only(['user', 'errors', 'from', 'to']),
            'userLabel' => fn (ReplaySession $session): string => $this->userLabel($session),
        ]);
    }

    /** GET {path}/{session} */
    public function show(ReplaySession $session): View
    {
        return view('session-replay::viewer.show', [
            'session' => $session->load('user'),
            'userLabel' => $this->userLabel($session),
        ]);
    }

    protected function userLabel(ReplaySession $session): string
    {
        if ($session->user_id === null) {
            return __('Guest');
        }

        $attribute = (string) config('session-replay.viewer.user_label', 'email');
        $label = $session->user?->getAttribute($attribute);

        return is_scalar($label) && (string) $label !== '' ? (string) $label : '#'.$session->user_id;
    }

    protected function date(mixed $value): ?Carbon
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
