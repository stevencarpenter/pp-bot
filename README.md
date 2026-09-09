# pp-bot

A Slack Socket Mode bot with PostgreSQL leaderboards for `++`/`--` votes on users and things.

![pp-bot logo](docs/assets/ppbot_github_1280x640.png)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/pp-bot)

## Quick Start

Use Node.js 24, a PostgreSQL database, and a [configured Slack app](docs/DEPLOYMENT.md#slack-app-setup).
From a checkout of this repository:

```bash
npm ci
cp .env.example .env
```

Edit `.env` with your Slack credentials and `DATABASE_URL`, then run:

```bash
npm run build
node --env-file=.env dist/index.js
```

Startup creates or upgrades the database schema. In Slack, run `/help` to verify the connection.
If startup fails, use the error message and [deployment diagnostics](docs/DEPLOYMENT.md#diagnostics).
When your platform already supplies environment variables, `npm start` builds and runs the bot.

## Usage

Select a Slack user mention to vote for a person. Plain text `@name` votes for a thing.

```text
@john ++ for the great presentation!
@jane --
@pat ++++ excellent work
@john ++ and @jane ++ for the release!
@broncos ++ for the comeback win!
```

Two signs change the score by one; each extra sign adds one, up to `MAX_VOTE_SCORE_DELTA` (default: 5).
Self-votes are blocked. Each target counts once per message, and replayed Slack events are ignored.
Rate limits, cooldowns, and channel restrictions can also block votes.

| Command        | Result                         |
| -------------- | ------------------------------ |
| `/leaderboard` | Top 10 users and top 10 things |
| `/score`       | Your current score             |
| `/help`        | Voting syntax and commands     |

See [examples](docs/EXAMPLES.md) for message patterns and responses.

## Configuration

Set `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, and `SLACK_SIGNING_SECRET` to real Slack credentials.
Set `DATABASE_URL` for voting and leaderboards; the runtime has no in-memory storage fallback.
The `.env` file is loaded by the `--env-file` command above, not by `npm start`.

For production, set `NODE_ENV=production`. PostgreSQL TLS defaults to `verify-full`, abuse controls
default to `enforce`, and retention cleanup runs at startup and every 12 hours.

See the [environment reference](docs/CONFIGURATION.md), [deployment guide](docs/DEPLOYMENT.md),
and [production security baseline](docs/SECURITY-HARDENING.md).
The [threat model](pp-bot-threat-model.md) records the deployment assumptions and security tradeoffs.

## Contributing

Run `npm run build`, `npm test`, and `npm run format` before submitting changes.
See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

Open [GitHub issues](https://github.com/stevencarpenter/pp-bot/issues) for support or feature requests.
Report vulnerabilities privately through GitHub Security Advisories as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
