<?php

namespace Packstub\SessionReplay\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Packstub\SessionReplay\Models\ReplaySession;

/** The first batch of a new recording was stored. */
class ReplaySessionStarted
{
    use Dispatchable;

    public function __construct(public ReplaySession $session) {}
}
