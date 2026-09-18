<?php

namespace Packstub\SessionReplay\Models;

use Illuminate\Database\Eloquent\Model;

/** The replay tables follow session-replay.storage.connection, so they stay central in a database-per-tenant app. */
abstract class ReplayModel extends Model
{
    protected $guarded = [];

    public function getConnectionName(): ?string
    {
        return config('session-replay.storage.connection') ?: parent::getConnectionName();
    }
}
