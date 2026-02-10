# Examples

## Basic voting

```
@john ++ for the great presentation!
@jane ++ 🎉
```

Response:

```
<@john>'s score increased to 1
<@jane>'s score increased to 1
```

## Downvotes

```
@bob --
@alice -- not cool
```

Response:

```
<@bob>'s score decreased to -1
<@alice>'s score decreased to -1
```

## Multiple votes in one message

```
@john ++ and @jane ++ for the amazing work!
```

Response:

```
<@john>'s score increased to 2
<@jane>'s score increased to 2
```

## Things leaderboard

```
@broncos ++ for the comeback win!
@release -- needs more QA time
```

Response:

```
Score for *broncos* increased to 1
Score for *release* decreased to -1
```

## Direct message

```
@alice ++ thanks for the help in DMs
```

Response:

```
<@alice>'s score increased to 3
```

## Threaded reply

If you reply inside a thread, the bot responds in the same thread.

## Slash commands

```
/leaderboard
```

Response:

```
🏆 Leaderboard 🏆

Users
🥇 <@alice>: 6
🥈 <@bob>: 2
🥉 <@john>: 2

Things
🥇 *broncos*: 4
🥈 *release*: 1
```

```
/score
```

Response:

```
<@alice>'s current score is 6
```

```
/help
```

Response:

```
pp-bot help

Voting
@user ++ or @user -- to update a user score
@thing ++ or @thing -- to update a thing score

Commands
/leaderboard - show top users and things
/score - show your current score
/help - show this help message
```
