# pp-bot

This is a small Slack bot that manages a leaderboard of Slack users in an organization. Users can vote for each other
using `@user ++` or `@user --` to increment or decrement their score on the leaderboard.

## Features

- **Upvote/Downvote**: Mention a user with `@username ++` or `@username --` to change their score
- **Flexible Format**: Add any text or emojis after the `++` or `--` (e.g., `@user ++ great job! 🎉`)
- **Leaderboard**: View the top scorers with the `/leaderboard` command
- **Personal Score**: Check your own score with the `/score` command
- **Self-Vote Prevention**: Users cannot vote for themselves

## Usage

### Voting

To increase someone's score:

```bash
@john ++ for the great presentation!
@jane ++ 🎉
```

To decrease someone's score:

```bash
@bob --
@alice -- not cool
```

You can vote for multiple people in one message:

```bash
@john ++ and @jane ++ for the amazing work!
```

### Commands

- `/leaderboard` - Display the top 10 users on the leaderboard
- `/score` - Check your current score

## Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- A Slack workspace with admin access to create apps
- (Optional) PostgreSQL if you want persistent storage locally; tests use an in-memory pg-mem database.

### Installation

1. Clone this repository:

```bash
git clone https://github.com/stevencarpenter/pp-bot.git
cd pp-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create a Slack App:
    - Go to https://api.slack.com/apps
    - Click "Create New App" → "From scratch"
    - Name your app (e.g., "PP Bot") and select your workspace

4. Configure your Slack App:
    - **OAuth & Permissions**: Add these Bot Token Scopes:
        - `app_mentions:read`
        - `chat:write`
        - `channels:history`
        - `channels:read`
        - `groups:history`
        - `groups:read`
        - `im:history`
        - `mpim:history`
        - `commands`
    - **Socket Mode**: Enable Socket Mode and create an App-Level Token with `connections:write` scope
    - **Slash Commands**: Create two commands:
        - `/leaderboard` - Description: "Show the leaderboard"
        - `/score` - Description: "Show your score"
    - **Event Subscriptions**: Enable events and subscribe to:
        - `message.channels`
        - `message.groups`
        - `message.im`
        - `message.mpim`

5. Install the app to your workspace (OAuth & Permissions page)

6. Create a `.env` file with your tokens (copy from `.env.example`):

```bash
cp .env.example .env
```

7. Edit `.env` and add your tokens:
    - `SLACK_BOT_TOKEN`: Bot token (starts with `xoxb-`)
    - `SLACK_APP_TOKEN`: App-level token (starts with `xapp-`)
    - `SLACK_SIGNING_SECRET`: App signing secret
    - (Optional) `DATABASE_URL`: e.g. `postgres://user:pass@localhost:5432/ppbot`

### Running the Bot

```bash
npm start
```

If `DATABASE_URL` is not provided, DB-backed features will warn and score persistence won't work; tests always use an
in-memory database.

### Running Tests

```bash
npm test
```

### Database & Storage

The current implementation uses PostgreSQL (or pg-mem in tests) with two tables:

- `leaderboard(user_id PK, score, created_at, updated_at)`
- `vote_history(id PK, voter_id, voted_user_id, vote_type, channel_id?, message_ts?, created_at)`

Migrations: `npm run migrate` will create the tables on a real database.

## How It Works

The bot listens to messages. When it detects voting syntax it:

1. Parses the message (`parseVote`)
2. Updates the user's score (`updateUserScore`) using an UPSERT
3. Records vote history (`recordVote`)
4. Emits response messages for each action

The `/leaderboard` and `/score` slash commands query the database.

## Development Notes

- Tests use an ephemeral pg-mem backed pool substitute to avoid dangling sockets.
- Integration tests build schema via a shared `ensureSchema` helper.
- Coverage thresholds enforce a baseline to catch regressions early.

## License

MIT
