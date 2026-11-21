# pp-bot brand and design principles

pp-bot is a Slack bot for voting on people and things with `++` and `--`.
It keeps scores in leaderboards. The identity should make that interaction easy to recognize.

## Principles

1. **Show the action.** Use the `++` mark and real voting syntax to explain the product.
2. **Keep the focus on people.** Describe votes and scores without judging the people or things behind them.
3. **Make the result clear.** Use direct labels, readable text, and examples that match the bot's behavior.
4. **Keep the tone light.** Be friendly and concise. Avoid jokes that make a negative vote feel personal.
5. **Build for small surfaces.** The mark must remain recognizable as a Slack avatar and in repository previews.

## Name and voice

Write the name as **pp-bot**, including the hyphen and lowercase letters. Keep commands and syntax
exactly as the bot accepts them. Prefer short, direct sentences. Use “people and things” when
explaining the two kinds of voting targets. Do not describe scores as endorsements or performance reviews.

The short description is: **Votes and leaderboards for Slack.**

## Logo

The mark combines a speech bubble with `++`, the bot's voting syntax. The silver line is decorative. Use the complete mark without stretching, recoloring individual parts,
or adding effects. Leave clear space around it and use the square export for avatars.

| Asset                                           | Use                                         |
| ----------------------------------------------- | ------------------------------------------- |
| [Mark, SVG](assets/pp-bot-mark.svg)             | Scalable source for the avatar              |
| [Mark, PNG](assets/pp-bot.png)                  | 1024 × 1024 avatar                          |
| [Mark, 2048 PNG](assets/ppbot_2048.png)         | Large square export                         |
| [Mark, 4096 PNG](assets/ppbot_4096.png)         | High-resolution square export               |
| [Banner, SVG](assets/pp-bot-banner.svg)         | Editable repository banner source           |
| [Banner, PNG](assets/ppbot_github_1280x640.png) | 1280 × 640 GitHub social preview and README |

The banner SVG uses an Arial-compatible sans serif. Use the PNG when identical text rendering matters.

## Color and type

The palette is **Graphite & White**.

| Role                  | Color      | Value     |
| --------------------- | ---------- | --------- |
| Ink                   | Near-black | `#222326` |
| Paper                 | Soft white | `#FAFAFA` |
| Vote                  | Graphite   | `#383B42` |
| Accent                | Silver     | `#BBC1C8` |
| Secondary text on ink | Light gray | `#D6D8DB` |

Use paper text on ink for primary contrast. Use graphite on paper for marks and emphasis.
Reserve silver for small accents. Do not rely on color alone to distinguish positive
and negative votes. Documentation should use the host platform's readable sans serif for prose
and monospace for commands, identifiers, and examples.

## Regenerate the PNGs

The SVG files are the source assets. With [resvg](https://github.com/linebender/resvg) installed, run:

```sh
resvg -w 1024 docs/assets/pp-bot-mark.svg docs/assets/pp-bot.png
resvg -w 2048 docs/assets/pp-bot-mark.svg docs/assets/ppbot_2048.png
resvg -w 4096 docs/assets/pp-bot-mark.svg docs/assets/ppbot_4096.png
resvg docs/assets/pp-bot-banner.svg docs/assets/ppbot_github_1280x640.png
```

Banner typography depends on available fonts. Check the rendered PNG after regeneration.
