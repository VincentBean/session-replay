<?php

use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

beforeEach(function () {
    Route::get('context', fn () => response()->json(Context::all()));
});

it('adds the running recording and where to watch it to the log context', function () {
    $id = (string) Str::uuid();

    $this->withUnencryptedCookie('session_replay_id', $id)->get('context')
        ->assertJson(['session_replay' => $id, 'session_replay_url' => route('session-replay.show', $id)]);
});

it('ignores a cookie that is not a recording id, and stays quiet when turned off', function () {
    $this->withUnencryptedCookie('session_replay_id', '<script>')->get('context')->assertJsonMissingPath('session_replay');

    config()->set('session-replay.context.enabled', false);

    $this->withUnencryptedCookie('session_replay_id', (string) Str::uuid())->get('context')->assertJsonMissingPath('session_replay');
});
