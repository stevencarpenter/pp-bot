# Slack App Setup & Configuration Guide

**Milestone:** Phase 1: Foundation
**Labels:** documentation, setup

---

## 📋 Context

This repository contains a Slack bot that uses Socket Mode to manage a leaderboard through ++ and -- voting. Before deploying to production, we need comprehensive documentation for setting up a new Slack App from scratch.

**Current State:**
- README contains basic setup instructions
- `.env.example` lists required tokens
- No detailed step-by-step guide for Slack App creation
- Missing OAuth scope documentation
- No troubleshooting section

**Target State:**
- Complete Slack App setup documentation
- Step-by-step instructions with screenshots/descriptions
- All required OAuth scopes documented
- Troubleshooting guide for common issues

---

## 🎯 Objective

Create comprehensive documentation (SLACK_SETUP.md) that guides users through creating and configuring a Slack App for the pp-bot, including all necessary permissions, tokens, and Socket Mode setup.

---

## 🔧 Technical Specifications

### Required OAuth Scopes

The bot requires the following **Bot Token Scopes** (xoxb-):

```
app_mentions:read    # Listen for @mentions of the bot
channels:history     # Read messages in public channels
channels:read        # View basic channel information
groups:history       # Read messages in private channels
groups:read          # View basic private channel information
im:history           # Read direct messages
mpim:history         # Read group direct messages
chat:write           # Send messages as the bot
commands             # Handle slash commands (/leaderboard, /score)
```

The bot also requires an **App-Level Token** (xapp-) with:
```
connections:write    # Required for Socket Mode WebSocket connection
```

### Slash Commands to Configure

1. `/leaderboard` - Display top 10 users
   - Command: `/leaderboard`
   - Short Description: "Show the current leaderboard"
   - Usage Hint: *none*

2. `/score` - Show individual user score
   - Command: `/score`
   - Short Description: "Show your current score or another user's score"
   - Usage Hint: `[@user]`

### Event Subscriptions

Since we're using **Socket Mode**, no Request URL is needed. Enable the following events:

```
message.channels     # Messages in public channels
message.groups       # Messages in private channels
message.im           # Direct messages
message.mpim         # Group direct messages
app_mention          # When bot is @mentioned
```

---

## 📝 Implementation Steps

### Step 1: Create Documentation File

1. Create `SLACK_SETUP.md` in the root directory
2. Structure the document with clear sections:
   - Prerequisites
   - Creating a Slack App
   - Configuring OAuth Scopes
   - Setting up Socket Mode
   - Creating Slash Commands
   - Installing to Workspace
   - Getting Your Tokens
   - Environment Configuration
   - Troubleshooting

### Step 2: Document Slack App Creation

Include detailed instructions for:

```markdown
#### 1. Create a New Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Select "From scratch"
4. Enter App Name: "PP Bot" (or your preferred name)
5. Select your workspace
6. Click "Create App"
```

### Step 3: Document OAuth Scopes Configuration

```markdown
#### 2. Configure OAuth Scopes

1. In the left sidebar, click "OAuth & Permissions"
2. Scroll to "Scopes" → "Bot Token Scopes"
3. Click "Add an OAuth Scope"
4. Add the following scopes one by one:
   - `app_mentions:read`
   - `channels:history`
   - `channels:read`
   - `groups:history`
   - `groups:read`
   - `im:history`
   - `mpim:history`
   - `chat:write`
   - `commands`
```

### Step 4: Document Socket Mode Setup

```markdown
#### 3. Enable Socket Mode

1. In the left sidebar, click "Socket Mode"
2. Toggle "Enable Socket Mode" to ON
3. Enter a token name: "pp-bot-socket"
4. Add the `connections:write` scope (should be pre-selected)
5. Click "Generate"
6. **IMPORTANT:** Copy the token starting with `xapp-` and save it securely
   - This is your `SLACK_APP_TOKEN`
   - You won't be able to view it again!
```

### Step 5: Document Event Subscriptions

```markdown
#### 4. Subscribe to Bot Events

1. In the left sidebar, click "Event Subscriptions"
2. Toggle "Enable Events" to ON
3. Under "Subscribe to bot events", add:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`
   - `app_mention`
4. Click "Save Changes"
```

### Step 6: Document Slash Commands Creation

```markdown
#### 5. Create Slash Commands

##### Command 1: /leaderboard
1. In the left sidebar, click "Slash Commands"
2. Click "Create New Command"
3. Enter the following:
   - Command: `/leaderboard`
   - Short Description: `Show the current leaderboard`
   - Usage Hint: (leave empty)
4. Click "Save"

##### Command 2: /score
1. Click "Create New Command" again
2. Enter the following:
   - Command: `/score`
   - Short Description: `Show your current score or another user's score`
   - Usage Hint: `[@user]`
3. Click "Save"
```

### Step 7: Document Installation

```markdown
#### 6. Install App to Workspace

1. In the left sidebar, click "Install App"
2. Click "Install to Workspace"
3. Review the permissions
4. Click "Allow"
5. You'll be redirected back to the Slack API dashboard
6. **IMPORTANT:** Copy the "Bot User OAuth Token" starting with `xoxb-`
   - This is your `SLACK_BOT_TOKEN`
   - Save it securely!
```

### Step 8: Document Token Retrieval

```markdown
#### 7. Retrieve Your Signing Secret

1. In the left sidebar, click "Basic Information"
2. Scroll to "App Credentials"
3. Find "Signing Secret"
4. Click "Show" and copy the value
   - This is your `SLACK_SIGNING_SECRET`
```

### Step 9: Add Troubleshooting Section

Include common issues and solutions:

```markdown
### Troubleshooting

#### Bot doesn't respond to messages
- ✅ Ensure Socket Mode is enabled
- ✅ Check that `SLACK_APP_TOKEN` starts with `xapp-`
- ✅ Verify all event subscriptions are saved
- ✅ Check console for connection errors
- ✅ Restart the bot after changing Slack App settings

#### Bot responds with "cannot vote for themselves"
- ✅ This is expected behavior when users try to vote for themselves
- ✅ Votes must be for other users: `@otheruser ++`

#### Slash commands don't work
- ✅ Ensure commands are created in Slack API dashboard
- ✅ Commands must be typed exactly: `/leaderboard` not `/Leaderboard`
- ✅ Check that `commands` scope is added to OAuth scopes
- ✅ Reinstall the app if you added the scope after installation

#### "Invalid token" error
- ✅ Check that tokens are correctly copied (no extra spaces)
- ✅ Bot token should start with `xoxb-`
- ✅ App token should start with `xapp-`
- ✅ Ensure tokens are in `.env` file, not `.env.example`

#### Bot works locally but not in production
- ✅ Verify all environment variables are set in production
- ✅ Check that production environment can connect to Slack's WebSocket
- ✅ Review production logs for connection errors
```

---

## ✅ Acceptance Criteria

- [ ] `SLACK_SETUP.md` file created in repository root
- [ ] Complete step-by-step instructions for Slack App creation
- [ ] All required OAuth scopes documented with explanations
- [ ] Socket Mode setup instructions included
- [ ] Slash command creation steps documented
- [ ] Instructions for obtaining all three tokens (Bot, App, Signing Secret)
- [ ] `.env.example` updated if any new variables are needed
- [ ] Troubleshooting section with at least 5 common issues
- [ ] Instructions tested by following them to create a new Slack App
- [ ] Document is clear enough for non-technical users
- [ ] Links to official Slack documentation included where relevant

---

## 📚 Reference Documentation

- [Slack API: Apps](https://api.slack.com/apps)
- [Slack API: Socket Mode](https://api.slack.com/apis/connections/socket)
- [Slack API: OAuth Scopes](https://api.slack.com/scopes)
- [Slack API: Slash Commands](https://api.slack.com/interactivity/slash-commands)
- [@slack/bolt Framework](https://slack.dev/bolt-js/)
- [Current README.md](./README.md) - for reference
- [Current .env.example](./.env.example) - for environment variables

---

## 🔗 Dependencies

**Blocks:** None (this is foundational documentation)

**Blocked By:** None

---

## 💡 Implementation Notes

### Example Environment Variables Section

Include a section showing how to configure `.env`:

```markdown
### Environment Configuration

Create a `.env` file in the project root with your tokens:

\`\`\`bash
# Slack Bot Token (from OAuth & Permissions page)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Slack App Token (from Socket Mode page)
SLACK_APP_TOKEN=xapp-your-app-token-here

# Slack Signing Secret (from Basic Information page)
SLACK_SIGNING_SECRET=your-signing-secret-here
\`\`\`

⚠️ **Security Note:** Never commit `.env` to version control. The `.gitignore` file already excludes it.
```

### Testing Instructions

After creating the documentation:

1. Create a new test Slack workspace (or use an existing test workspace)
2. Follow the `SLACK_SETUP.md` instructions step-by-step
3. Document any unclear steps or missing information
4. Verify all tokens work with the bot
5. Test all slash commands and message voting

---

## 🏷️ Labels

- `documentation`
- `setup`
- `priority: high`
- `good-first-issue`

---

## 📅 Estimated Effort

**Time Estimate:** 2-3 hours

- Writing documentation: 1.5 hours
- Testing instructions: 0.5-1 hour
- Revisions and polish: 0.5 hour
