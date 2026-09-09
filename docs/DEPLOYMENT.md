# Deploy pp-bot

Run one bot process per Slack workspace to keep the process-local abuse limits consistent.
The bot uses Socket Mode and does not need a public HTTP endpoint.

## Prerequisites

Use a Slack workspace where you can install apps, a PostgreSQL database, and a checkout of
[pp-bot](https://github.com/stevencarpenter/pp-bot). For Railway, you also need a
[Railway account](https://railway.app) with access to the repository.
For local operation, follow the [quick start](../README.md#quick-start).

## Slack App Setup

1. Create an app at [Slack Apps](https://api.slack.com/apps) for your workspace.
2. Enable Socket Mode. Create an app-level token with `connections:write` and save it as `SLACK_APP_TOKEN`.
3. Add bot scopes `chat:write` and `commands`. Enable only the message events and matching history
   scopes needed for your deployment:

   | Conversation         | Event              | Bot scope          |
   | -------------------- | ------------------ | ------------------ |
   | Public channel       | `message.channels` | `channels:history` |
   | Private channel      | `message.groups`   | `groups:history`   |
   | Direct message       | `message.im`       | `im:history`       |
   | Group direct message | `message.mpim`     | `mpim:history`     |

4. Create `/leaderboard`, `/score`, and `/help` slash commands.
5. Install the app and save its bot token as `SLACK_BOT_TOKEN`. Copy the signing secret from
   Basic Information to `SLACK_SIGNING_SECRET`.
6. Invite the bot to the channels where people will vote.

Verify the installed app has the selected scopes and event subscriptions before deploying.
If they differ, correct the configuration and reinstall the app. This bot handles `message.*` events;
`app_mentions:read`, `channels:read`, and `groups:read` are not needed for these handlers.
See Slack's [Socket Mode scope](https://docs.slack.dev/reference/scopes/connections.write/) and
[message event reference](https://docs.slack.dev/reference/events/message.channels).

## Railway Setup

1. Create a project in the Railway dashboard and connect the bot service to the GitHub repository
   and intended deployment branch. Verify the service source before continuing; correct it if it
   points to another repository or branch.
2. Add a PostgreSQL service. Set the bot service's `DATABASE_URL` to the database connection string
   reachable from the runtime. Verify the reference targets this database and environment.
3. Set the three Slack credentials, `NODE_ENV=production`, `DB_SSL_MODE=verify-full`, and
   `ALLOW_INSECURE_DB_SSL=false`. If your database uses a private CA, supply `DB_SSL_CA_PEM_B64`.
   Review the [configuration reference](CONFIGURATION.md) and [security baseline](SECURITY-HARDENING.md).
   Do not copy the development `DB_SSL_MODE=disable` from `.env.example` into production.
4. Use `npm run build` as the build command and `node dist/index.js` as the start command after
   dependency installation. Check the build logs for a successful TypeScript build; fix build errors
   before testing the Slack connection.
5. Deploy and complete [verification](#verification). If the service fails, inspect
   [diagnostics](#diagnostics) before retrying.

Railway deploys pushes to the configured branch when GitHub autodeploys are enabled.
See [GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys) and
[build/start commands](https://docs.railway.com/builds/build-and-start-commands).
The [Railway template](https://railway.com/deploy/pp-bot) is another entry point for provisioning.

For an existing service, the [Railway CLI](https://docs.railway.com/cli) supports:

```bash
railway link
railway up
```

Confirm that `railway link` selects the intended project, environment, and service before uploading.
After `railway up`, verify the deployment as below; on failure, inspect its build and runtime logs.

## Database Schema

Startup runs [the migration](../src/scripts/migrate.ts), which owns schema creation and upgrades.
Do not maintain a separate copy of its SQL. To run it explicitly, export `DATABASE_URL` and the
[database TLS settings](CONFIGURATION.md#database-tls-controls), then run:

```bash
npm run migrate
```

Expect `Migration complete`; investigate `Migration failed` before starting the bot.
The schema contains `leaderboard`, `thing_leaderboard`, `vote_history`, and `message_dedupe`.
Only user votes enter `vote_history`. Configure database backups in your hosting platform.

## Verification

Expect `Database migrations complete` and `Slack bot is running` in runtime logs.
With maintenance enabled, also expect `Maintenance cleanup complete` and the 12-hour schedule message.
The bot has no HTTP health endpoint, so verify the deployment status, logs, and Slack behavior:

```text
/help
@user ++
/leaderboard
/score
```

Select another user's actual Slack mention for the vote. Expect a score response and that user's
updated leaderboard entry. `/score` reports the command caller's score.
If responses are missing, check the bot's channel membership, credentials, scopes, and subscriptions.

## Diagnostics

For a linked Railway service:

```bash
railway logs
railway logs --build
```

Runtime logs should show the verification messages above. Build logs should show successful compilation.
For a database error, check reachability, `DATABASE_URL`, and the TLS configuration in the affected
service environment. For repeated cleanup errors, follow the [security operations runbook](SECURITY-OPERATIONS.md).
Use Railway's usage dashboard to monitor resources and billing.

## Rollback

In Railway's Deployments tab, select the last known-good deployment and choose Rollback from its menu.
Verify the restored deployment's logs and Slack commands. Rollback changes the application deployment;
review database compatibility separately. If verification fails, use the diagnostics above.
See [deployment actions](https://docs.railway.com/deployments/deployment-actions).

## Support

- [Railway documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [pp-bot issues](https://github.com/stevencarpenter/pp-bot/issues)
