<?php

namespace Packstub\SessionReplay\Models;

/**
 * @property string $hash
 * @property string $path
 * @property int $bytes
 * @property int $raw_bytes
 */
class ReplayAsset extends ReplayModel
{
    protected $table = 'replay_assets';

    protected function casts(): array
    {
        return ['last_seen_at' => 'datetime'];
    }
}
