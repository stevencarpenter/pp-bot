# Security Operations Runbook

## When to use this

Use this runbook for a suspected credential leak, unusual voting or bot activity, recurring maintenance
failures, or scheduled secret rotation in an owner-operated deployment.

## Diagnose

For a linked Railway service, run `railway logs`. Expect startup to show `Database migrations complete`
and `Slack bot is running`. With maintenance enabled, expect `Maintenance cleanup complete` at startup
and every 12 hours. Repeated connection or cleanup errors indicate an operational failure.

From your database console, run `SELECT 1;`. Expect one row containing `1`.
Review recent Slack activity for vote spikes, repeated votes from one user or channel, abrupt score
swings, or unexpected bot messages. If a credential is known to be exposed, revoke it immediately.

## Secret Rotation

Every 90 days:

1. Rotate `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` in Slack app settings. Regenerate `SLACK_SIGNING_SECRET` if needed.
2. Update deployment secrets and restart the bot.
3. Verify startup logs and `/help`, `/score`, and `/leaderboard`. If they fail, correct the new credentials
   and app permissions, then restart.
4. Confirm old tokens are revoked.

## Suspected Slack Token Leak

Target containment within 15 minutes:

1. Revoke exposed tokens in Slack app settings and generate replacements.
2. Update the affected deployment secrets and restart. Verify startup and all three slash commands;
   if verification fails, correct the replacement credentials and permissions.
3. Review recent bot activity and channel logs for abuse.
4. Open a private GitHub security advisory with the timeline and impact, following [SECURITY.md](../SECURITY.md).

## Suspected Database Credential Leak

1. Rotate database credentials and update `DATABASE_URL`. Keep `DB_SSL_MODE=verify-full` in production.
2. Restart, run `SELECT 1;` in the database console, and verify bot startup. If either fails, check
   the replacement connection string, runtime network access, and CA configuration.
3. Review write spikes and anomalous score changes.

## After an Incident

Record the cause, impact, remediation, and rotated secrets. Update the [security baseline](SECURITY-HARDENING.md)
and [threat model](../pp-bot-threat-model.md) when evidence changes their assumptions.
