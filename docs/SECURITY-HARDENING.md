# Security Hardening Baseline

Use this baseline for a single-service production deployment. The [threat model](../pp-bot-threat-model.md)
records its assumptions; the [configuration reference](CONFIGURATION.md) defines runtime defaults.

## Runtime and Data

- [ ] Set `NODE_ENV=production` and `LOG_LEVEL=info` or stricter.
- [ ] Use `DB_SSL_MODE=verify-full` and `ALLOW_INSECURE_DB_SSL=false`.
- [ ] Keep Slack credentials and `DATABASE_URL` in the deployment secret store; never commit `.env`.
- [ ] Keep PostgreSQL privately reachable and configure database backups.
- [ ] Keep `MAINTENANCE_ENABLED=true`, dedupe retention at 14 days, and vote-history retention at 365 days.
- [ ] Verify successful maintenance logs at startup and every 12 hours.
- [ ] Follow the [90-day secret rotation routine](SECURITY-OPERATIONS.md#secret-rotation).

## Abuse Controls

- [ ] Use `ABUSE_ENFORCEMENT_MODE=enforce`.
- [ ] Set `VOTE_MAX_TARGETS_PER_MESSAGE=5` or lower.
- [ ] Set `VOTE_RATE_USER_PER_MIN=12` and `VOTE_RATE_CHANNEL_PER_MIN=60` or lower.
- [ ] Set `VOTE_PAIR_COOLDOWN_SECONDS=300` or higher for this stricter baseline. The runtime default is 2 seconds.
- [ ] Set `VOTE_DAILY_DOWNVOTE_LIMIT=15` or lower.
- [ ] Set `VOTE_ALLOWED_CHANNEL_IDS` if voting should be limited to specific channels.

## Slack and Repository

- [ ] Request only the scopes and message events used by your deployment. See [Slack app setup](DEPLOYMENT.md#slack-app-setup).
- [ ] Keep [CodeQL](../.github/workflows/codeql.yml), [dependency audit](../.github/workflows/ci.yml),
      [gitleaks](../.github/workflows/secret-scan.yml), and [Dependabot](../.github/dependabot.yml) enabled.
- [ ] Enable GitHub secret scanning, push protection, Dependabot alerts, and code scanning alerts in repository settings.

Use the [security operations runbook](SECURITY-OPERATIONS.md) for suspected compromise or failed controls.
