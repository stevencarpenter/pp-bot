
# Issue #1: Slack App setup instructions (bot tokens, permissions, OAuth scopes)

**Labels:** `documentation`, `setup`  
**Milestone:** Foundation Setup  
**Estimated Effort:** 4-6 hours

## Description
Create comprehensive documentation for setting up the Slack App with proper bot tokens, permissions, and OAuth scopes required for pp-bot to function correctly.

## Tasks
- [ ] Document required OAuth scopes for Bot Token
  - `app_mentions:read` - Read mentions of the bot
  - `chat:write` - Send messages
  - `channels:history` - Read channel messages
  - `channels:read` - View channel info
  - `groups:history` - Read private channel messages
  - `groups:read` - View private channel info
  - `im:history` - Read DM messages
  - `mpim:history` - Read group DM messages
  - `commands` - Handle slash commands
- [ ] Document App-Level Token requirements
  - `connections:write` - Required for Socket Mode
- [ ] Create step-by-step Slack App creation guide
  1. Navigate to https://api.slack.com/apps
  2. Click "Create New App" → "From scratch"
  3. Enter App Name and select workspace
  4. Configure OAuth & Permissions
  5. Enable Socket Mode
  6. Create App-Level Token
  7. Install app to workspace
- [ ] Document how to obtain and rotate tokens securely
- [ ] Add troubleshooting section for common authentication issues
- [ ] Include screenshots or diagrams for visual guidance

## Code Examples

### Environment Variables Setup
```bash
# Slack Bot Token (starts with xoxb-)
SLACK_BOT_TOKEN=xoxb-your-token-here

# Slack App Token (starts with xapp-)
SLACK_APP_TOKEN=xapp-your-token-here

# Slack Signing Secret
SLACK_SIGNING_SECRET=your-signing-secret-here
```

### Verifying Token Permissions (Node.js)
```javascript
const { WebClient } = require('@slack/web-api');
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

// Test authentication
async function verifyAuth() {
  try {
    const result = await client.auth.test();
    console.log('✓ Authentication successful');
    console.log('Bot User ID:', result.user_id);
    console.log('Team:', result.team);
  } catch (error) {
    console.error('✗ Authentication failed:', error.message);
  }
}

verifyAuth();
```

## Acceptance Criteria
- [ ] Documentation clearly explains all required permissions
- [ ] Step-by-step setup guide is complete and tested
- [ ] Token security best practices are documented
- [ ] Troubleshooting guide covers common issues
- [ ] Code examples are tested and working
- [ ] Documentation is reviewed by at least one other person

## Resources
- [Slack App Setup Guide](https://api.slack.com/start/quickstart)
- [OAuth Scopes Reference](https://api.slack.com/scopes)
- [Socket Mode Documentation](https://api.slack.com/apis/connections/socket)
