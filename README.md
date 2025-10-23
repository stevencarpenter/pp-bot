# pp-bot

This is a small Slack bot that manages a leaderboard of Slack users in an organization. Users can vote for each other using `@user ++` or `@user --` to increment or decrement their score on the leaderboard.

## Features

- **Upvote/Downvote**: Mention a user with `@username ++` or `@username --` to change their score
- **Flexible Format**: Add any text or emojis after the `++` or `--` (e.g., `@user ++ great job! 🎉`)
- **Leaderboard**: View the top scorers with the `/leaderboard` command
- **Personal Score**: Check your own score with the `/score` command
- **Self-Vote Prevention**: Users cannot vote for themselves

## Usage

### Voting

To increase someone's score:
```
@john ++ for the great presentation!
@jane ++ 🎉
```

To decrease someone's score:
```
@bob --
@alice -- not cool
```

You can vote for multiple people in one message:
```
@john ++ and @jane ++ for the amazing work!
```

### Commands

- `/leaderboard` - Display the top 10 users on the leaderboard
- `/score` - Check your current score

## Setup

### Prerequisites

- Node.js (v14 or higher)
- A Slack workspace with admin access to create apps

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
   - `SLACK_BOT_TOKEN`: Find this in "OAuth & Permissions" (starts with `xoxb-`)
   - `SLACK_APP_TOKEN`: Find this in "Basic Information" under "App-Level Tokens" (starts with `xapp-`)
   - `SLACK_SIGNING_SECRET`: Find this in "Basic Information" (under "App Credentials")

### Running the Bot

```bash
npm start
```

The bot should now be running and ready to respond to messages in your Slack workspace!

### Running Tests

```bash
npm test
```

## How It Works

The bot listens to all messages in channels where it's invited. When it detects a pattern like `@user ++` or `@user --`, it:

1. Parses the message to extract user mentions and actions
2. Updates the leaderboard scores (stored in `leaderboard.json`)
3. Responds with the updated score
4. Prevents users from voting for themselves

## Storage

Scores are stored in a `leaderboard.json` file in the bot's directory. This file is created automatically when the first vote is cast.

## License

MIT 
