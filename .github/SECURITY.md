# Security Policy

Session Replay records what people see and do in a Laravel app, and lets authorized people watch it. Please report anything that records what the masking rules should have hidden, lets someone open a recording the app's `viewSessionReplay` gate denies, or lets one person write into another person's recording.

If you discover a security issue, email [support@packstub.dev](mailto:support@packstub.dev) instead of using the issue tracker. We answer within a few days and credit reporters in the changelog unless they prefer otherwise.

What is recorded, what is masked by default and how access is decided are described in [docs/privacy.md](../docs/privacy.md) and [docs/watching.md](../docs/watching.md).
