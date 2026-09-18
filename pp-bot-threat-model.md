# pp-bot Threat Model

Slack credentials and deployment configuration determine access to the bot and its data.
The runtime combines replay protection, abuse limits, verified production database TLS, retention
cleanup, and log redaction. These controls assume a small, owner-operated deployment.

## Scope and Assumptions

This model covers message and slash-command handling, configuration, database access and migrations,
maintenance, logging, and repository security workflows. It assumes one bot service for one Slack
workspace, low-sensitivity leaderboard data, and PostgreSQL privately reachable from the runtime.
Slack credentials reside in deployment secrets. Multi-tenant or horizontally scaled deployments need
a separate assessment because abuse counters are process-local.

## Trust Boundaries

- **Slack to runtime:** [Bolt handlers](src/index.ts) receive message text, user and channel IDs,
  timestamps, event IDs, and slash-command payloads through Socket Mode. The parser sanitizes targets;
  handlers ignore bot messages, block self-votes, deduplicate messages, and enforce abuse policy.
- **Runtime to PostgreSQL:** [storage queries](src/storage/database.ts) use parameters.
  [Migrations](src/scripts/migrate.ts) establish score tables and uniqueness constraints for message
  dedupe and user vote history. User vote recording and score updates share one SQL statement.
  [TLS policy](src/security/db-ssl.ts) protects runtime and migration connections.
- **Operator to runtime:** [environment validation](src/env.ts) checks required Slack credentials,
  placeholder values, and configuration. An operator can weaken abuse enforcement or explicitly
  override production TLS requirements.
- **Runtime to log readers:** [logging](src/logger.ts) redacts recognized Slack tokens and PostgreSQL
  URL passwords. Access to logs remains sensitive because redaction is pattern-based.

There is no public HTTP event endpoint in the current Socket Mode deployment. Slash commands read
leaderboard data or return help. [Replay keys](src/utils/dedupe.ts) prefer Slack `event_id`, then
channel and timestamp; votes with neither are rejected. Dedupe keys are released after processing
failures only when no persistent vote/score write has completed.

## Assets

- Slack bot/app tokens and signing secret: credential confidentiality and bot identity.
- User and thing leaderboards: score integrity and availability.
- User vote history and message dedupe: auditability and replay protection.
- Database credentials, TLS settings, and abuse policy: persistence and enforcement integrity.
- Runtime logs: incident evidence and confidentiality of any logged secrets.

Workspace members, including compromised accounts, can submit arbitrary vote-like text and commands
where the bot is present. An attacker with deployment secret access can impersonate the bot.

## Threats

### TM-001: Slack credential compromise

**Priority: high. Likelihood: medium. Impact: high.** An attacker with bot or app tokens can act with
the app's granted Slack permissions, compromising bot identity and workspace trust.
[Environment checks](src/env.ts) reject missing or placeholder credentials;
[log redaction](src/logger.ts) and [gitleaks](.github/workflows/secret-scan.yml) reduce accidental exposure.
Token lifecycle and deployment access remain operator responsibilities.
Use least-privilege scopes and the [rotation and revocation runbook](docs/SECURITY-OPERATIONS.md).
Watch for unexpected bot posting, session activity, or permission changes.

### TM-002: Vote manipulation under permissive configuration

**Priority: medium. Likelihood: medium. Impact: medium.** A workspace account can manipulate scores
when limits are excessive or `ABUSE_ENFORCEMENT_MODE=monitor` allows violations to proceed.
[Abuse controls](src/security/abuse-controls.ts) enforce channel, target-count, user/channel rate,
pair-cooldown, and daily-downvote limits. Monitor mode logs violations but does not block them.
Keep production in `enforce` mode with the [security baseline](docs/SECURITY-HARDENING.md).
Watch abuse-control log entries, vote velocity, and score swings.

### TM-003: Abuse counters reset on restart

**Priority: low. Likelihood: low. Impact: medium.** Service restarts discard process-local counters,
allowing renewed voting before prior cooldowns or quotas would otherwise expire.
[Reservations and rollback](src/security/abuse-controls.ts) protect local accounting around writes;
they do not preserve counters across restarts or share them across processes.
This continuity tradeoff is accepted for the single-service deployment model.
Correlate unusual voting and blocked-vote counts with deployment and restart times.

### TM-004: Database transport downgrade

**Priority: low. Likelihood: low. Impact: high.** A network attacker can exploit a production deployment
that explicitly enables insecure TLS and uses an untrusted database network path.
[DB TLS policy](src/security/db-ssl.ts) defaults to `verify-full` and blocks weaker modes unless
`ALLOW_INSECURE_DB_SSL=true`. The override remains available for deployments that intentionally need it.
Keep verification enabled and review any production change to `DB_SSL_MODE` or the override.

### TM-005: Unbounded history and dedupe growth

**Priority: low. Likelihood: low. Impact: medium.** Disabled or repeatedly failing maintenance allows
normal or abusive traffic to grow `vote_history` and `message_dedupe`, increasing database cost and
availability pressure. [Maintenance](src/storage/maintenance.ts) deletes expired records at startup
and every 12 hours. Keep it enabled and investigate cleanup failures and table-size growth.
Retention removes audit and replay records, so choose periods appropriate to the deployment.

### TM-006: Secrets outside recognized log patterns

**Priority: low. Likelihood: low. Impact: medium.** A log reader may obtain secrets that do not match
the Slack-token or PostgreSQL-password patterns in [the logger](src/logger.ts).
Recursive redaction covers supported nested values but does not recognize every credential format.
Restrict log access, avoid logging raw configuration, and investigate secret-like values in logs.

## Repository Controls

[CI](.github/workflows/ci.yml) runs build/tests and dependency auditing.
[CodeQL](.github/workflows/codeql.yml), [gitleaks](.github/workflows/secret-scan.yml), and
[Dependabot](.github/dependabot.yml) provide additional checks before deployment.
These checks complement the runtime controls; they do not contain a compromised deployment secret.
See the [security baseline](docs/SECURITY-HARDENING.md) for required repository settings.
