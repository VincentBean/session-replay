<?php

namespace Packstub\SessionReplay\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Packstub\SessionReplay\Models\ReplayAsset;
use Packstub\SessionReplay\Models\ReplaySession;
use Packstub\SessionReplay\Support\ReplayStorage;

class PruneCommand extends Command
{
    protected $signature = 'session-replay:prune {--days= : Keep this many days instead of retention.days}';

    protected $description = 'Delete recordings older than the retention window (pinned ones stay) and the stylesheets nothing references any more';

    public function handle(ReplayStorage $storage): int
    {
        $days = (int) ($this->option('days') ?? config('session-replay.retention.days', 30));

        if ($days < 1) {
            $this->components->error('The retention window must be at least one day.');

            return self::FAILURE;
        }

        $sessions = 0;

        // One by one, so each recording's files go with it (the model's deleting hook).
        ReplaySession::query()->prunable($days)->chunkById(200, function ($batch) use (&$sessions): void {
            foreach ($batch as $session) {
                $session->delete();
                $sessions++;
            }
        });

        // A batch that references a stylesheet moves its last-seen date (at most once a day), so a stylesheet last seen
        // well before the oldest recording that is left, a pinned one included, is referenced by nothing.
        $oldest = ReplaySession::query()->min('started_at');
        $assets = 0;

        ReplayAsset::query()
            ->where('last_seen_at', '<', now()->subDays($days))
            ->when($oldest !== null, fn ($query) => $query->where('last_seen_at', '<', Carbon::parse($oldest)->subDays(2)))
            ->chunkById(200, function ($batch) use (&$assets, $storage): void {
                foreach ($batch as $asset) {
                    $storage->delete($asset->path);
                    $asset->delete();
                    $assets++;
                }
            });

        $this->components->info("Pruned {$sessions} recordings and {$assets} stylesheets older than {$days} days.");

        return self::SUCCESS;
    }
}
