# Security Operations Runbook

Last reviewed: 2026-02-10

This runbook is for owner-operated hobby deployments of pp-bot.

## 1) Secret Rotation Routine (Every 90 Days)

1. Rotate `SLACK_BOT_TOKEN` in Slack app settings.
2. Rotate `SLACK_APP_TOKEN` in Socket Mode token settings.
3. Regenerate `SLACK_SIGNING_SECRET` if needed.
4. Update Railway (or your platform) environment variables.
5. Restart deployment and verify:
   - bot connects
   - `/help`, `/score`, and `/leaderboard` work
6. Confirm old tokens are revoked.

## 2) Suspected Token Leak (Target: Complete in <15 Minutes)

1. Revoke leaked Slack token(s) immediately in Slack app settings.
2. Generate replacement token(s).
3. Update deployment secrets (`SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`).
4. Redeploy/restart.
5. Review recent bot activity and channel logs for abuse.
6. Open a private GitHub security advisory with timeline and impact.

## 3) Suspected Database Credential Leak

1. Rotate DB credentials and `DATABASE_URL`.
2. If production, enforce `DB_SSL_MODE=verify-full`.
3. Redeploy and run a sanity check query (`SELECT 1`).
4. Review write spikes and anomalous score changes.

## 4) GitHub Controls (Repository Settings)

Enable these in GitHub repository settings:

- Secret scanning
- Push protection for secret scanning
- Dependabot alerts
- Code scanning alerts (CodeQL)

Workflow coverage in this repo:

- `.github/workflows/ci.yml` (build, tests, npm audit)
- `.github/workflows/codeql.yml` (code scanning)
- `.github/workflows/secret-scan.yml` (gitleaks)

## 5) Detection Signals to Watch

- Sudden spikes in vote volume
- Rapid repeated votes from one user or one channel
- Unexpected bot message behavior
- Abrupt score swings for one person/target
- Repeated maintenance cleanup failures

## 6) Post-Incident Checklist

- Rotate impacted secrets
- Capture root cause and remediation
- Update `docs/SECURITY-HARDENING.md` if baseline changed
- Revisit `pp-bot-threat-model.md` with new evidence
