<?php

namespace Packstub\SessionReplay\Tests\Fixtures\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Packstub\SessionReplay\Concerns\HasSessionReplays;

class User extends Authenticatable
{
    use HasSessionReplays;

    protected $guarded = [];
}
