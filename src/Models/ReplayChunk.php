<?php

namespace Packstub\SessionReplay\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $replay_session_id
 * @property int $seq
 * @property string $path
 * @property int $bytes
 * @property int $event_count
 * @property int $from_ms
 * @property int $to_ms
 */
class ReplayChunk extends ReplayModel
{
    protected $table = 'replay_chunks';

    public function session(): BelongsTo
    {
        return $this->belongsTo(ReplaySession::class, 'replay_session_id');
    }
}
