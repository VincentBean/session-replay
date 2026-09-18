<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Packstub\SessionReplay\Tests\Fixtures\Models\User;

Route::middleware('web')->group(function () {
    Route::get('/', function () {
        Auth::login(User::query()->firstOrCreate(['email' => 'ada@example.com'], ['name' => 'Ada Lovelace', 'password' => 'secret']));

        return view('workbench');
    });

    Route::get('second', fn () => view('workbench', ['second' => true]));
    Route::get('login', fn () => redirect('/'))->name('login');
});
