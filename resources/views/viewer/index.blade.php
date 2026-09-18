@extends('session-replay::viewer.layout')

@section('content')
    <header class="top">
        <h1>{{ __('Session Replay') }}</h1>
        <span class="muted">{{ trans_choice(':count recording|:count recordings', $sessions->total(), ['count' => $sessions->total()]) }}</span>
    </header>

    <form class="filters card" method="get">
        <label>{{ __('User ID') }} <input type="text" name="user" value="{{ $filters['user'] ?? '' }}" size="10"></label>
        <label>{{ __('From') }} <input type="date" name="from" value="{{ $filters['from'] ?? '' }}"></label>
        <label>{{ __('To') }} <input type="date" name="to" value="{{ $filters['to'] ?? '' }}"></label>
        <label class="check"><input type="checkbox" name="errors" value="1" @checked($filters['errors'] ?? false)> {{ __('With errors') }}</label>
        <button class="primary" type="submit">{{ __('Filter') }}</button>
        @if (array_filter($filters))
            <a class="button" href="{{ route('session-replay.index') }}">{{ __('Reset') }}</a>
        @endif
    </form>

    <div class="card table-scroll">
        @if ($sessions->isEmpty())
            <p class="empty">{{ __('No recordings yet. Put @@sessionReplay before </body> in a layout and open a page.') }}</p>
        @else
            <table>
                <thead>
                    <tr>
                        <th>{{ __('Person') }}</th>
                        <th>{{ __('Started') }}</th>
                        <th>{{ __('Length') }}</th>
                        <th>{{ __('Pages') }}</th>
                        <th>{{ __('Errors') }}</th>
                        <th>{{ __('Vitals') }}</th>
                        <th>{{ __('First page') }}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($sessions as $session)
                        <tr>
                            <td>
                                {{ $userLabel($session) }}
                                @if ($session->impersonator_id) <span class="badge warn" title="{{ __('Impersonated by #:id', ['id' => $session->impersonator_id]) }}">{{ __('impersonated') }}</span> @endif
                            </td>
                            <td title="{{ $session->started_at?->toDayDateTimeString() }}">
                                {{ $session->started_at?->diffForHumans() }}
                                @if ($session->isLive()) <span class="badge ok">{{ __('live') }}</span> @endif
                            </td>
                            <td>{{ $session->durationForHumans() }}</td>
                            <td>{{ $session->page_count }}</td>
                            <td>
                                @if ($session->error_count) <span class="badge danger">{{ $session->error_count }}</span> @else <span class="muted">0</span> @endif
                                @if ($session->rage_click_count) <span class="badge warn" title="{{ __('Rage clicks') }}">{{ $session->rage_click_count }}×</span> @endif
                            </td>
                            <td>
                                @php($rating = $session->vitalsRating())
                                @if ($rating) <span class="badge {{ ['good' => 'ok', 'needs-improvement' => 'warn', 'poor' => 'danger'][$rating] }}">{{ __(str_replace('-', ' ', $rating)) }}</span> @else <span class="muted">·</span> @endif
                            </td>
                            <td class="url muted" title="{{ $session->entry_url }}">{{ \Illuminate\Support\Str::after((string) $session->entry_url, '://') }}</td>
                            <td><a href="{{ route('session-replay.show', $session) }}">{{ __('Watch') }}</a></td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    @if ($sessions->hasPages())
        <nav class="pages">
            <span>@if ($sessions->previousPageUrl()) <a href="{{ $sessions->previousPageUrl() }}">← {{ __('Newer') }}</a> @endif</span>
            <span class="muted">{{ __('Page :page of :pages', ['page' => $sessions->currentPage(), 'pages' => $sessions->lastPage()]) }}</span>
            <span>@if ($sessions->nextPageUrl()) <a href="{{ $sessions->nextPageUrl() }}">{{ __('Older') }} →</a> @endif</span>
        </nav>
    @endif
@endsection
