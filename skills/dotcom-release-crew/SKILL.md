---
name: dotcom-release-crew
description: Post to the #development Discord channel naming the people whose critical fixes or significant features are in this week's tldraw.com (dotcom) release. Use when preparing the weekly dotcom release, when asked who should be involved in this week's release, or when the scheduled release-crew automation runs. Examines the production...main commit range, selects contributors of meaningful user-facing or stability changes (not the whole team), and posts a concise summary via a Discord webhook.
---

# Dotcom release crew

Identify who contributed **critical fixes or significant features** to this week's dotcom release (the commits on `main` that are not yet on `production`) and post a short summary to the `#development` Discord channel.

The goal is a tight list of people to involve in the release — not a changelog and not the whole engineering team.

## Inputs

- `DISCORD_RELEASE_WEBHOOK_URL` — environment variable holding the Discord webhook that posts to `#development`. Required. If it is unset, stop and tell the user to set it (do not hardcode a webhook URL — this repo is public).
- `GH_TOKEN` — used by `gh`. Present automatically in CI; locally, ensure `gh auth status` works.

## Workflow

### 1. Fetch the commit range

Get every commit on `main` that is not on `production`, with its author and subject line. `--paginate` handles ranges larger than 250 commits.

```bash
gh api repos/tldraw/tldraw/compare/production...main --paginate \
  --jq '.commits[] | [ (.author.login // .commit.author.name), (.commit.author.name), (.commit.message | split("\n")[0]) ] | @tsv'
```

Each row is: `login`\t`display name`\t`subject`. tldraw squash-merges PRs, so the commit author is the PR author and the subject is the PR title (usually a conventional commit like `feat(editor): ...` with a trailing `(#1234)`).

Also capture the human-readable diff URL for the message: `https://github.com/tldraw/tldraw/compare/production...main`.

If there are **zero** commits, post a brief note that there are no changes to release this week and stop.

### 2. Select the critical contributors

Read the subject lines and keep only commits that a release manager would want a human on hand for. Group the kept commits by author.

**Include** (judgment, not just prefix):

- `feat` — significant features, especially scoped to `dotcom`, `editor`, `sync`, `sync-core`, `store`, `tlschema`, `state`.
- `fix` — meaningful correctness, data-integrity, sync, or crash fixes.
- `perf` — performance changes that affect users.
- Anything touching multiplayer sync, persistence/migrations, or auth/billing, even if small.

**Exclude:**

- `docs`, `test`, `chore`, `style`, `ci`, `build`, and dependency bumps (dependabot, "Bump versions", `[skip ci]`).
- Trivial `fix`es (typos, comments, lint, flaky-test pins, snapshot updates).
- Reverts that cancel out another commit in the same range.

When unsure whether a change is "critical", lean toward **excluding** it — the point is a short, high-signal list. It is fine for a busy week to surface only 3–6 people.

### 3. Compose the message

Keep it under 2000 characters (Discord's limit). One bullet per person; if someone has multiple notable changes, list them under one bullet. Use plain names — do not attempt Discord `@` mentions.

Format:

```
🚀 **dotcom release — people to involve this week**
Critical changes on production...main:

• **Mime Čuvalo** (mimecuvalo) — fix(release): don't cut a new SDK version for docs-only patches
• **Kevin Ingersoll** (frolic) — feat(editor): finer, coarse-pointer-aware hit-testing

N critical changes from M contributors · https://github.com/tldraw/tldraw/compare/production...main
```

If nothing critical was selected but there were commits, say so briefly (e.g. "No critical changes flagged this week — release looks routine.") and still include the diff link.

### 4. Post to Discord

Post the message as the webhook's `content`. Build the JSON safely (do not string-interpolate the message into the JSON by hand — use `jq` so newlines and quotes are escaped):

```bash
jq -n --arg content "$MESSAGE" '{content: $content}' \
  | curl -sS -X POST -H "Content-Type: application/json" -d @- "$DISCORD_RELEASE_WEBHOOK_URL"
```

A successful post returns HTTP 204 with an empty body. Report to the user what was posted (or that the post failed, with the curl output).

## Notes

- Do not commit or echo the full webhook URL anywhere.
- This skill only reads git history and posts a message; it never modifies the repo.
