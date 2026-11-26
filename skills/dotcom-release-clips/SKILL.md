---
name: dotcom-release-clips
description: Record short before/after clips of the user-facing changes in this week's tldraw.com (dotcom) release and post them to Discord as drafts for marketing. Use alongside dotcom-release-marketing when preparing the weekly dotcom release, when asked for before/after videos or GIFs of a release or a PR, or when the weekly release-marketing workflow runs it after the summary. Scripts each change from its PR description, records it frame by frame against the before and after builds, and posts an MP4 per change.
---

# Dotcom release clips

Turn the highlights of this week's dotcom release into short before/after clips: the same action on tldraw.com before and after the change, so people see what changed at a glance. Marketing uses them for social posts.

This is a companion to [[dotcom-release-marketing]]. That skill decides what users will notice and writes it up; this one films the parts that can be shown. The weekly workflow runs the two back to back, and the clips post to the same marketing channel straight after the summary. The clips are **drafts for a human to review**, like the summary.

**Arguments**: $ARGUMENTS

- `--dry-run`: record and encode everything, then print what would be posted instead of posting.
- `--range <base>...<head>`: use this range instead of `origin/production...origin/main`.
- `--prs <n,n,...>`: film these PRs instead of choosing from the range.
- `--bullets <file>`: the bullets [[dotcom-release-marketing]] posted, saved with its `--bullets-out`. Choose from these instead of writing the bullets again.

## Inputs

- `DISCORD_MARKETING_WEBHOOK_URL`: the marketing channel's Discord webhook, the same one the summary posts through. Required unless `--dry-run`. If it's unset and this isn't a dry run, stop and say so. Never print it.
- `GH_TOKEN`: used by `gh`.
- Tools: Node 22+, ffmpeg, jq, and the repo installed (`pnpm install`) with Playwright's Chromium (`pnpm dlx playwright@<version> install chromium`).
- Optional: `CLIPS_SYSTEM_CURSORS`, a folder of macOS cursor images (see "Cursors" below).

Everything is written under `skills/dotcom-release-clips/tmp/` (gitignored). `shoot.mjs` refuses to write anywhere else.

## Workflow

### 1. Choose what to film

Skip this step with `--prs`.

With `--bullets`, read the file: each line is a posted bullet followed by its PR numbers in brackets. Otherwise follow [[dotcom-release-marketing]] steps 1 to 3 for the same range: fetch the commits, select what a user could notice, and write the bullets. Keep each bullet's PR numbers; you need them here.

Then decide, **for every bullet**, whether a clip makes sense and what kind. Read the PR descriptions (step 3's command) before deciding: the `### Before` and `### After` sections usually settle it. Each bullet gets one of three decisions:

- **Before and after**: the old and new behavior differ visibly within a few seconds, and someone watching the two takes side by side would spot the difference without reading the caption. This is the normal decision for bug fixes and changed behavior.
- **After only**: a new feature where the before take would show nothing useful, or would mislead, for example its shortcut or typing triggering unrelated tools.
- **Skip**: no clip. Skip when:
  - it needs an account (comments, sharing, workspaces, settings, sign-in) or a feature flag;
  - it's about timing or the network (sync, reconnection, slow loads, performance);
  - the difference is too subtle to see at video size, such as a pixel of alignment or a slightly different colour;
  - the before is a crash, a blank page or an error that's awkward to reproduce;
  - the bullet is clearer in words than on screen, for example a fix that only matters in a rare situation that takes longer to set up than to explain.

When in doubt, skip: a clip that doesn't obviously show the change is worse than no clip. Usually a third to a half of the bullets get a clip. Film at most four; if more qualify, keep the ones with the most visible change.

Write the decisions to `skills/dotcom-release-clips/tmp/decisions.md`, one line per bullet: the bullet, its decision, and a short reason.

```
- Pressing Z right after picking a tool could leave the zoom tool stuck on... | before and after | the zoom cursor stays on in the before take
- Comment threads now keep your draft when you switch pages. | skip | needs an account
```

If every bullet is a skip, say so and stop.

### 2. Find the before and after

```bash
skills/dotcom-release-clips/scripts/sources.sh <pr> [<pr> ...]
```

Each line says how to get the two versions:

- `staging`: record **production tldraw.com** (`https://www.tldraw.com/`) as before and **staging** (`https://staging.tldraw.com/`) as after. This is the normal case.
- `build`: the change already went out to production as a hotfix, so production and staging look the same. That's expected: it still belongs in the week's notes. Build the examples app at the two commits the line gives, serve each, and record against `/develop`:

  ```bash
  S=skills/dotcom-release-clips
  $S/scripts/build-examples.sh <before-commit> $S/tmp/builds/<pr>-before
  $S/scripts/build-examples.sh <after-commit> $S/tmp/builds/<pr>-after
  node $S/scripts/serve.mjs $S/tmp/builds/<pr>-before 6101 &
  node $S/scripts/serve.mjs $S/tmp/builds/<pr>-after 6102 &
  # before: http://127.0.0.1:6101/develop   after: http://127.0.0.1:6102/develop
  ```

  The examples app is the same editor as tldraw.com without tldraw.com's own header and menus, which is fine for a canvas change. Stop the servers when you're done.

### 3. Write a shot for each PR

Read `references/shot-format.md` and the examples in `references/shots/`. Then read the PR's full description:

```bash
gh pr view <pr> --repo tldraw/tldraw --json title,body --jq '.title + "\n\n" + .body'
```

The `### Before`, `### After` and `### Test plan` sections are the script. A bug fix's test plan usually is the shot, step for step. Write the shot to `skills/dotcom-release-clips/tmp/<pr>/shot.mjs`.

Film it the way step 1 decided. If writing the shot shows the decision was wrong, for example the before and after would look the same, change it in `decisions.md` with the reason.

### 4. Record

```bash
S=skills/dotcom-release-clips
node $S/scripts/shoot.mjs --shot $S/tmp/<pr>/shot.mjs --url <before-url> --label Before --out $S/tmp/<pr>/before
node $S/scripts/shoot.mjs --shot $S/tmp/<pr>/shot.mjs --url <after-url> --label After --out $S/tmp/<pr>/after
```

For an after-only clip, record only the after take and leave out `--label`. With nothing to compare against, an "After" label is redundant.

Each take takes 15 to 30 seconds. The two can run at the same time. A take stops with an error if the shot has a typo, a point doesn't resolve, or the page throws: fix the shot and run it again. Warnings about speed or unmapped cursors are worth reading but don't stop the take.

### 5. Encode and check

```bash
skills/dotcom-release-clips/scripts/encode.sh <pr>-<short-description> $S/tmp/<pr>/before $S/tmp/<pr>/after
```

Pass only the after folder for an after-only clip. Name it with the PR number and a few words, for example `11201-locked-group-arrow`. This writes a 1920x1080 MP4 for Discord, a 1120x630 GIF for the archive, and a contact sheet.

**Look at the contact sheet before posting.** Check that:

- the change is visible: the after take shows the new behavior and the before take shows the old one;
- nothing covers the subject (a panel, a menu, a toast);
- the cursor enters, acts and leaves.

If the change isn't visible, adjust the shot and record again. After two failed attempts, drop the clip and record it as a skip in `decisions.md` with the reason. A clip that doesn't show the change is worse than no clip.

### 6. Post

Write each caption to `skills/dotcom-release-clips/tmp/<pr>/caption.txt`: the clip's bullet from the marketing summary, then a line saying whether it's before and after or after only. No PR links, code identifiers or emoji, the same as the summary. Then post one message per clip:

```bash
skills/dotcom-release-clips/scripts/post-discord.sh [--dry-run] $S/tmp/<pr>/caption.txt $S/tmp/<pr>-<short-description>.mp4
```

Report what was posted, and include `decisions.md` so the skipped bullets and their reasons are visible.

## Cursors

Headless Chrome draws no cursor, so `shoot.mjs` draws one: tldraw's own cursors on the canvas, and tldraw's arrow over other UI. Over links, buttons and text fields a real Mac shows its pointing hand and I-beam instead. Apple's artwork can't be checked into this repo, so on a Mac, render it once and point the recorder at it:

```bash
swift skills/dotcom-release-clips/scripts/render-macos-cursors.swift skills/dotcom-release-clips/tmp/cursors
export CLIPS_SYSTEM_CURSORS=skills/dotcom-release-clips/tmp/cursors
```

## How recording works

`shoot.mjs` freezes the page's clock and renders one frame at a time, advancing page time by exactly one frame (24 ms at 1.2x speed, played back at 50fps). Nothing is dropped however slow the machine is, and the speed-up costs nothing. It runs tldraw's animation frames and steps CSS animations itself, so camera moves, toasts and menus stay smooth. The page presents as a Mac, so Cmd shortcuts and ⌘ menu hints match a Mac recording on any host.

## Notes

- This skill only reads git history, records, and posts. It never modifies the repo, apart from temporary worktrees under `tmp/` that `build-examples.sh` removes.
- Production, staging and the examples app all run logged out. Signed-in features can't be filmed yet.
