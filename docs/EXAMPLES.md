# Voting Examples

Select a Slack user mention for a person. A plain `@name` that is not a user mention votes for a thing.
The responses below assume scores start at zero and abuse limits allow the votes.

## Users

```text
@john ++ for the great presentation!
@jane ---
@pat ++++ excellent work
@john ++ and @jane ++ for the release!
```

`++` adds 1, `---` subtracts 2, and `++++` adds 3. The configured score cap is 5 by default.
For a user with ID `U123`, a single upvote produces:

```text
<@U123>'s score increased by +1 to 1
```

The bot rejects self-votes, ignores repeated targets in one message, and applies
[abuse limits](CONFIGURATION.md#abuse-controls). DMs require the matching Slack scopes and subscriptions
in [Slack app setup](DEPLOYMENT.md#slack-app-setup).

## Things

```text
@broncos ++ for the comeback win!
@release -- needs more QA time
```

```text
Score for *broncos* increased by +1 to 1
Score for *release* decreased by -1 to -1
```

## Commands

- `/leaderboard` shows the top 10 users and top 10 things, or prompts you to start voting when both are empty.
- `/score` reports your score, for example `<@U123>'s current score is 1`.
- `/help` displays voting syntax, commands, and examples.
