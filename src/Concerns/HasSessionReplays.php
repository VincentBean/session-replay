<?php

namespace Packstub\SessionReplay\Concerns;

use Illuminate\Database\Eloquent\Relations\MorphMany;
use Packstub\SessionReplay\Models\ReplaySession;

/** For the model people sign in with: $user->sessionReplays()->latest('started_at')->first()?->url(). */
trait HasSessionReplays
{
    public function sessionReplays(): MorphMany
    {
        return $this->morphMany(ReplaySession::class, 'user');
    }
}
