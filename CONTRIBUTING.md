# Contributing to pp-bot

Thank you for your interest in contributing to pp-bot! This document provides guidelines and information to help you
contribute effectively.

## Project Structure

```
pp-bot/
├── index.js           # Main bot logic and entry point
├── index.test.js      # Unit tests for core functionality
├── package.json       # Node.js dependencies and scripts
├── .env.example       # Example environment variables
├── .gitignore         # Files to exclude from git
├── README.md          # Main documentation
├── EXAMPLES.md        # Usage examples
└── leaderboard.json   # Auto-generated leaderboard data (git-ignored)
```

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pp-bot.git
   cd pp-bot
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up your `.env` file with Slack credentials (see README.md)

## Running Tests

Run the test suite before submitting changes:

```bash
npm test
```

All tests should pass before you submit a pull request.

## Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add comments for complex logic
- Keep functions small and focused
- Follow existing code patterns

## Adding New Features

When adding new features:

1. **Write tests first**: Add tests to `index.test.js` for your new functionality
2. **Implement the feature**: Make minimal changes to achieve the goal
3. **Update documentation**: Add usage examples and update README.md if needed
4. **Run tests**: Ensure all tests pass with `npm test`
5. **Test manually**: If possible, test with a real Slack workspace

## Common Tasks

### Adding a new slash command

1. Add the command handler in `index.js` inside the `startBot()` function:
   ```javascript
   app.command('/mycommand', async ({ command, ack, say }) => {
     await ack();
     // Your command logic here
     await say('Response');
   });
   ```

2. Configure the command in your Slack App settings
3. Add tests for the new command
4. Update README.md with command documentation

### Modifying the vote pattern

The voting pattern is defined in the `parseVote()` function:

```javascript
const regex = /<@([A-Z0-9]+)>\s*(\+\+|--)/g;
```

If you need to change how votes are detected:

1. Update the regex pattern
2. Add tests covering the new pattern
3. Update EXAMPLES.md with new usage examples

### Changing leaderboard storage

The current implementation uses a JSON file (`leaderboard.json`). To change this:

1. Modify `loadLeaderboard()` and `saveLeaderboard()` functions
2. Ensure backward compatibility or provide migration path
3. Update tests to work with the new storage method
4. Document the new storage method in README.md

## Pull Request Guidelines

1. **Create a descriptive PR title**: Use a clear, concise title
2. **Describe your changes**: Explain what you changed and why
3. **Reference issues**: If fixing a bug, reference the issue number
4. **Keep PRs focused**: One feature or fix per PR
5. **Ensure tests pass**: All tests must pass
6. **Update documentation**: Update README.md and EXAMPLES.md as needed

## Testing with Slack

To test your changes with a real Slack workspace:

1. Create a test Slack workspace (free)
2. Set up a new Slack App for development
3. Configure your `.env` with the test app credentials
4. Run `npm start` and interact with the bot

## Questions?

If you have questions or need help:

- Open an issue on GitHub
- Check existing issues and documentation
- Review the code comments

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
