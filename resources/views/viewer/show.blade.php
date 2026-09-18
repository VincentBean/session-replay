@extends('session-replay::viewer.layout')

@section('title', $userLabel)

@section('content')
    <header class="top">
        <h1>{{ $userLabel }} <span class="muted">· {{ $session->started_at?->toDayDateTimeString() }}</span></h1>
        <a href="{{ url()->previous() !== url()->current() ? url()->previous() : route('session-replay.index') }}">← {{ __('All recordings') }}</a>
    </header>

    <dl class="facts card">
        <div><dt>{{ __('Length') }}</dt><dd>{{ $session->durationForHumans() }} @if ($session->isLive()) <span class="badge ok">{{ __('live') }}</span> @endif</dd></div>
        <div><dt>{{ __('Pages') }}</dt><dd>{{ $session->page_count }}</dd></div>
        <div><dt>{{ __('Errors') }}</dt><dd>{{ $session->error_count }}</dd></div>
        <div><dt>{{ __('Device') }}</dt><dd>{{ $session->device ?? '·' }} @if ($session->viewport_width) <span class="muted">{{ $session->viewport_width }}×{{ $session->viewport_height }}</span> @endif</dd></div>
        <div><dt>{{ __('Size') }}</dt><dd>{{ \Illuminate\Support\Number::fileSize($session->bytes) }}</dd></div>
        @if ($session->impersonator_id)
            <div><dt>{{ __('Impersonated by') }}</dt><dd>#{{ $session->impersonator_id }}</dd></div>
        @endif
        <div><dt>{{ __('First page') }}</dt><dd title="{{ $session->entry_url }}">{{ $session->entry_url }}</dd></div>
    </dl>

    @if ($session->truncated)
        <p class="muted">{{ __('This recording reached its size limit and stops before the visit ended.') }}</p>
    @endif

    <x-session-replay::player :session="$session" />
@endsection
