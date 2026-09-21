<?php

namespace Packstub\SessionReplay\Support;

use Illuminate\Database\Eloquent\Model;

/**
 * What the server knew when it rendered the page — who is signed in, the
 * workspace, who is impersonating, the app's own properties — signed with
 * the app key and handed to the recorder, which sends it back with every
 * upload. The ingest endpoint trusts nothing else about identity, so it
 * needs no session, no cookie and no CSRF token, and a panel on its own
 * guard or a tenant in the URL is recorded correctly.
 */
class ContextToken
{
    /** ingest.token_days when the config does not say; a tab left open longer starts a new recording on its next page load. */
    public const DEFAULT_DAYS = 7;

    /** @param array<string, mixed> $properties */
    public function __construct(
        public ?string $userType = null,
        public ?string $userId = null,
        public ?string $tenantType = null,
        public ?string $tenantId = null,
        public ?string $impersonatorId = null,
        public array $properties = [],
        public int $issuedAt = 0,
    ) {}

    /** @param array<string, mixed> $properties */
    public static function for(?Model $user, ?Model $tenant = null, ?string $impersonatorId = null, array $properties = []): self
    {
        return new self(
            $user?->getMorphClass(),
            $user === null ? null : (string) $user->getKey(),
            $tenant?->getMorphClass(),
            $tenant === null ? null : (string) $tenant->getKey(),
            $impersonatorId,
            $properties,
            time(),
        );
    }

    public function isGuest(): bool
    {
        return $this->userId === null;
    }

    /** Names nobody: no person, no workspace, no impersonator. Only such a token may be exempt from expiry. */
    public function isAnonymous(): bool
    {
        return $this->userId === null && $this->tenantId === null && $this->impersonatorId === null;
    }

    public function isExpired(): bool
    {
        if ($this->isAnonymous() && ! config('session-replay.ingest.guest_tokens_expire', true)) {
            return false;
        }

        $days = max(1, (int) config('session-replay.ingest.token_days', self::DEFAULT_DAYS));

        return $this->issuedAt < time() - $days * 24 * 60 * 60;
    }

    /** The same person (or the same "nobody") as the recording's first batch. */
    public function sameUserAs(?string $userType, ?string $userId): bool
    {
        return $this->userType === $userType && $this->userId === $userId;
    }

    public function encode(): string
    {
        $payload = self::base64UrlEncode((string) json_encode([
            'u' => $this->isGuest() ? null : [$this->userType, $this->userId],
            't' => $this->tenantId === null ? null : [$this->tenantType, $this->tenantId],
            'i' => $this->impersonatorId,
            'p' => $this->properties,
            'iat' => $this->issuedAt,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return $payload.'.'.self::sign($payload);
    }

    /** Null when the token is malformed, was not signed by this app, or is too old. */
    public static function decode(?string $token): ?self
    {
        if (! is_string($token) || substr_count($token, '.') !== 1) {
            return null;
        }

        [$payload, $signature] = explode('.', $token);

        if (! hash_equals(self::sign($payload), $signature)) {
            return null;
        }

        $data = json_decode((string) self::base64UrlDecode($payload), true);

        if (! is_array($data) || ! is_int($data['iat'] ?? null)) {
            return null;
        }

        $token = new self(
            isset($data['u'][0]) ? (string) $data['u'][0] : null,
            isset($data['u'][1]) ? (string) $data['u'][1] : null,
            isset($data['t'][0]) ? (string) $data['t'][0] : null,
            isset($data['t'][1]) ? (string) $data['t'][1] : null,
            isset($data['i']) ? (string) $data['i'] : null,
            is_array($data['p'] ?? null) ? $data['p'] : [],
            $data['iat'],
        );

        return $token->isExpired() ? null : $token;
    }

    protected static function sign(string $payload): string
    {
        $key = (string) config('app.key');

        if (str_starts_with($key, 'base64:')) {
            $key = (string) base64_decode(substr($key, 7));
        }

        return self::base64UrlEncode(hash_hmac('sha256', 'session-replay|'.$payload, $key, true));
    }

    protected static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    protected static function base64UrlDecode(string $value): string|false
    {
        return base64_decode(strtr($value, '-_', '+/'), true);
    }
}
