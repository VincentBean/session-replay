<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** One row per uploaded batch of events; the gzip file sits at `path` on the storage disk. */
return new class extends Migration
{
    public function __construct()
    {
        $this->connection = config('session-replay.storage.connection');
    }

    public function up(): void
    {
        Schema::connection($this->connection)->create('replay_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('replay_session_id')->constrained('replay_sessions')->cascadeOnDelete();
            $table->unsignedInteger('seq');
            $table->string('path');
            $table->unsignedInteger('bytes');
            $table->unsignedInteger('event_count')->default(0);
            $table->unsignedBigInteger('from_ms'); // epoch milliseconds of the first and last event
            $table->unsignedBigInteger('to_ms');
            $table->timestamps();

            $table->unique(['replay_session_id', 'seq']);
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->dropIfExists('replay_chunks');
    }
};
