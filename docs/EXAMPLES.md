# Usage Examples

This file demonstrates how the pp-bot responds to various message patterns.

## Basic Voting

### Example 1: Simple upvote

**User message:**

```
@john ++
```

**Bot response:**

```
@john's score increased to 1
```

### Example 2: Simple downvote

**User message:**

```
@jane --
```

**Bot response:**

```
@jane's score decreased to -1
```

## Voting with Additional Text

### Example 3: Upvote with reason

**User message:**

```
@alice ++ for the amazing presentation!
```

**Bot response:**

```
@alice's score increased to 5
```

### Example 4: Downvote with emojis and text

**User message:**

```
@bob -- 😞 not cool dude
```

**Bot response:**

```
@bob's score decreased to 2
```

## Multiple Votes

### Example 5: Multiple votes in one message

**User message:**

```
@alice ++ and @john ++ for completing the project! 🎉
```

**Bot response:**

```
@alice's score increased to 6
@john's score increased to 2
```

## Self-Vote Prevention

### Example 6: Trying to vote for yourself

**User message:** (from user @john)

```
@john ++
```

**Bot response:**

```
@john cannot vote for themselves!
```

## Commands

### Example 7: View leaderboard

**User message:**

```
/leaderboard
```

**Bot response:**

```
🏆 Leaderboard 🏆

🥇 @alice: 6
🥈 @bob: 2
🥉 @john: 2
4. @charlie: 1
5. @dave: -1
```

### Example 8: Check your score

**User message:**

```
/score
```

**Bot response:**

```
@alice's current score is 6
```

## Edge Cases

### Example 9: No space before ++

**User message:**

```
@charlie++ nice work!
```

**Bot response:**

```
@charlie's score increased to 1
```

### Example 10: Mixed text and votes

**User message:**

```
Hey @alice ++ thanks for helping, and @bob -- that wasn't right
```

**Bot response:**

```
@alice's score increased to 7
@bob's score decreased to 1
```
