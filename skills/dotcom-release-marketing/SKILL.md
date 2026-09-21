---
name: dotcom-release-marketing
description: Post a plain-language summary of what's shipping in this week's tldraw.com (dotcom) release to the marketing team's Discord channel. Use when preparing the weekly dotcom release, when asked what's going out this week for a non-engineering audience, or when the scheduled release-marketing automation runs. Examines the production...main commit range, translates the user-facing changes into benefits marketing can understand, and posts a concise summary via a Discord webhook.
---

# Dotcom release marketing summary

Summarize what's shipping in this week's dotcom release (the commits on `main` that are not yet on `production`) for the **marketing team**, and post it to their Discord channel.

This is the marketing counterpart to [[dotcom-release-crew]]. Same commit range, different audience: the release-crew message names engineers to have on hand; this one tells non-technical folks **what users will notice** so they can plan announcements, social posts, and changelog copy. No engineer pings, no release-risk framing — just clear, human descriptions of what's new.

## Inputs

- `DISCORD_MARKETING_WEBHOOK_URL` — environment variable holding the Discord webhook that posts to the marketing channel. Required. If it is unset, stop and tell the user to set it (do not hardcode a webhook URL — this repo is public).
- `GH_TOKEN` — used by `gh`. Present automatically in CI; locally, ensure `gh auth status` works.

## Workflow

### 1. Fetch the commit range

Get every commit on `main` that is not on `production`, with its author and subject line. `--paginate` handles ranges larger than 250 commits.

```bash
gh api repos/tldraw/tldraw/compare/production...main --paginate \
  --jq '.commits[] | [ (.author.login // .commit.author.name), (.commit.message | split("\n")[0]) ] | @tsv'
```

Each row is: `login`\t`subject`. tldraw squash-merges PRs, so the subject is the PR title (usually a conventional commit like `feat(tldraw): ...` with a trailing `(#1234)`).

Also capture the human-readable diff URL for reference: `https://github.com/tldraw/tldraw/compare/production...main`.

If there are **zero** commits, post a brief note that there's nothing new shipping this week and stop.

### 2. Select what's worth telling marketing about

Read the subject lines and keep only changes a **user could actually notice or that marketing might want to talk about**. This is a different filter than the release-crew skill: you care about *visibility to users*, not release risk.

**Include** (judgment, not just prefix):

- `feat` — new features and capabilities, especially anything user-facing in `tldraw`, `editor`, `dotcom`, or sync/collaboration.
- `fix` — fixes to things users would have seen or complained about (visible bugs, broken interactions, export/embed/rendering issues, sync glitches).
- `perf` — performance improvements users will feel (faster loading, smoother canvas).
- Anything about collaboration, sharing, exports, embeds, or the overall look and feel.

**Exclude:**

- `docs`, `test`, `chore`, `style`, `ci`, `build`, dependency bumps, and internal refactors with no user-visible effect.
- Purely internal `fix`es (typos, lint, flaky tests, snapshots, type errors, dev-only tooling).
- Anything a non-engineer would have no way to observe or care about.

Keep the list tight and high-signal — a handful of highlights, not an exhaustive changelog. It's fine to have many commits that don't make the cut.

### 3. Translate into plain language

For each kept change, rewrite the conventional-commit subject into a short, human sentence describing **what it does for users**, not how it was built. Drop the `type(scope):` prefix and the trailing `(#1234)`.

Examples:

- `feat(tldraw): flip geo shapes with flipX/flipY like the image shape` → "You can now flip shapes horizontally and vertically, just like images."
- `fix(tldraw): size Vimeo embeds to their real aspect ratio` → "Vimeo embeds now show at their correct aspect ratio instead of being cropped or letterboxed."
- `perf(editor): faster hit-testing on dense canvases` → "The canvas stays smoother when you have lots of shapes."

Group the highlights into a few buckets when it helps readability:

- ✨ **New** — new features and capabilities.
- 💅 **Improved** — refinements, polish, performance.
- 🐛 **Fixed** — noticeable bugs squashed.

If a section would be empty, omit it.

### 4. Compose the message

Keep it under 2000 characters (Discord's limit). Sentence case, friendly and concrete, no jargon. Do **not** mention or ping engineers — this is a marketing-facing summary. It's fine to note if it's a light week.

Format:

```
📣 **Shipping to tldraw.com this week**

✨ **New**
• You can now flip shapes horizontally and vertically, just like images.

💅 **Improved**
• Vimeo embeds show at their correct aspect ratio.
• The canvas stays smoother on boards with lots of shapes.

🐛 **Fixed**
• Fixed asset associations churning on bookmarks and external assets.

Full changes: https://github.com/tldraw/tldraw/compare/production...main
```

If nothing user-facing was selected but there were commits, say so briefly (e.g. "Quiet week for user-facing changes — mostly under-the-hood work.") and still include the diff link.

### 5. Post to Discord

Post the message as the webhook's `content`. Build the JSON safely (do not string-interpolate the message into the JSON by hand — use `jq` so newlines and quotes are escaped):

```bash
jq -n --arg content "$MESSAGE" '{content: $content, allowed_mentions: {parse: []}}' \
  | curl -sS -X POST -H "Content-Type: application/json" -d @- "$DISCORD_MARKETING_WEBHOOK_URL"
```

`allowed_mentions.parse: []` makes sure no `@everyone`/`@here`/role/user mentions can ever fire from this message — marketing summaries should never ping anyone.

A successful post returns HTTP 204 with an empty body. Report to the user what was posted (or that the post failed, with the curl output).

## Notes

- Do not commit or echo the full webhook URL anywhere.
- This skill only reads git history and posts a message; it never modifies the repo.
- `production...main` assumes the normal weekly flow where the dotcom release is the `main → production` promotion, so this range is exactly what's about to ship. During SDK freeze weeks the range is less precise — see the note in [[dotcom-release-crew]].
