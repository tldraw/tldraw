---
name: dotcom-release-marketing
description: Post a plain-language summary of what's shipping in this week's tldraw.com (dotcom) release to the marketing team's Discord channel. Use when preparing the weekly dotcom release, when asked what's going out this week for a non-engineering audience, or when the scheduled release-marketing automation runs. Examines the production...main commit range, writes the user-facing changes in the house release-notes style, and posts a concise summary via a Discord webhook.
---

# Dotcom release marketing summary

Summarize what's shipping in this week's dotcom release (the commits on `main` that are not yet on `production`) for the **marketing team**, and post it to their Discord channel.

This is the marketing counterpart to [[dotcom-release-crew]]. Same commit range, different audience: the release-crew message names engineers to have on hand; this one tells non-technical folks **what users will notice** so they can plan announcements, social posts, and changelog copy. No engineer pings, no release-risk framing.

The output is a **draft for a human to edit**, not finished copy. It should read like a streamlined version of the SDK release notes: the same voice, the same discipline about describing bugs precisely, but only the highlights and with every developer-facing detail removed.

**Arguments**: $ARGUMENTS

- `--dry-run` — print the finished message to stdout instead of posting it. Use this for testing and for reviewing a draft locally.
- `--range <base>...<head>` — compare this range instead of `production...main`. Use it to regenerate a past week's summary (for example, the previous deploy's source commit against `main` as it was at the time).

## Inputs

- `DISCORD_MARKETING_WEBHOOK_URL` — environment variable holding the Discord webhook that posts to the marketing channel. Required unless `--dry-run` is given. If it is unset and this is not a dry run, stop and tell the user to set it (do not hardcode a webhook URL — this repo is public).
- `GH_TOKEN` — used by `gh`. Present automatically in CI; locally, ensure `gh auth status` works.

## Style source

Before writing anything, read the house style. Do not invent a tone.

1. `skills/shared/release-notes-guide.md` — the SDK release-notes style guide. Its rules for entry format, what to include, and what to omit apply here too.
2. The two most recent published release notes in `apps/docs/content/releases/` (the highest `vX.Y.0.mdx` files, not `next.mdx`). Read their introduction paragraph, `## Improvements`, and `## Bug fixes` sections. These are the examples to match.

Take their **discipline**, not their register. The SDK notes are written for developers; this summary is written for someone who uses tldraw.com and has never read a commit.

What to take from them:

- The **introduction paragraph** pattern: one or two sentences that lead with concrete features, not adjectives.
- The way **bugs are described as observed**, with the situation that triggered them. "Fix undo after a cut also reverting the change made before it." "Fix Escape being ignored while pressing on the canvas with the select tool." The condition is always there. Keep that; rephrase it for a user.
- Their restraint: short entries, no fluff, nothing that can't be verified.
- **No decorative emoji.** The SDK notes use none apart from 💥 and 🔜 as markers, and this summary uses none at all.

What to leave behind: anything under `## API changes`, PR links and numbers, anything in backticks, package names, the `Add`/`Fix` verb-first form, and explanations of *how* something was fixed.

## Workflow

### 1. Fetch the commit range

Set the range. Default is `production...main`; `--range` overrides it.

Get every commit in the range with its **full message**, not just the subject line. tldraw squash-merges PRs, so the subject is the PR title and the body is the PR description, which usually includes `### Before`, `### After`, or `### Release notes` sections. Those sections are where the precise description of a bug lives. `--paginate` handles ranges larger than 250 commits.

```bash
gh api "repos/tldraw/tldraw/compare/${RANGE}" --paginate \
  --jq '.commits[] | {sha: .sha[0:10], message: .commit.message}'
```

Also capture the human-readable diff URL: `https://github.com/tldraw/tldraw/compare/${RANGE}`.

If there are **zero** commits, post a brief note that there's nothing new shipping this week and stop.

### 2. Select what's worth telling marketing about

Keep only changes a **user of tldraw.com could notice**. Apply the SDK guide's include/omit rules, then tighten them for this audience.

**Include:**

- New features and capabilities users can see or use, in `dotcom`, `tldraw`, `editor`, or collaboration and sync.
- Improvements users will feel: visible polish, and performance only when the difference is noticeable in normal use.
- Fixes for bugs users would have hit: broken interactions, rendering, export, embeds, sync, sharing, sign-in.

**Exclude:**

- Anything that would sit under `## API changes` in the SDK notes.
- `docs`, `test`, `chore`, `ci`, `build`, dependency bumps, refactors, tooling, and anything only observable in code.
- Fixes for bugs introduced in the same range (the bug never reached users).
- Anything whose only honest description needs a code identifier.

For every candidate, answer one question: **what would a user have to do to notice this?** If there is no answer, drop it. If the answer is the condition of a bug, that condition goes in the bullet.

Aim for **three to six bullets**. Fewer is fine. It is normal for most commits not to make the cut.

### 3. Write the entries

Write each kept change as one or two short sentences to a person who uses tldraw.com. Under about 30 words per bullet, even for a feature made of several PRs: name the two or three things they'll notice and stop.

**Every bullet contains the situation**: what the reader does, or sees, that the change affects. Take it from the PR body's before/after or release-notes section. If you cannot find it, drop the bullet rather than guess.

For a new feature, say what it does, not what it's called. "You can now wrap a single shape in a frame by selecting it" rather than "Frame selection works on a single shape". Menu item and tool names are fine as a detail, never as the description.

For a fix, describe the situation and what happens now. It does not need to start with "Fix", and it should not read like a commit title. Any of these shapes works:

- Situation, then outcome: "Triple-clicking a bullet to select a whole list made the text vanish. It stays put now."
- Outcome with the condition attached: "The zoom tool now switches off when you release Z, even right after picking another tool."
- What now works: "Excalidraw drawings with custom stroke widths now paste correctly."
- Instead-of: "tldraw.com loads properly on slow connections instead of showing a \"Something went wrong\" page."

**Vary the shape across the message.** Six bullets in a row that open with the old bug ("X used to happen. Now Y.") read like a bug tracker. Lead with what happens now whenever the reader can infer the bug from it: "Excalidraw drawings with custom stroke widths now paste correctly" says enough without spelling out the failure. Lead with the situation only when the outcome is meaningless without it. No more than two consecutive bullets should open with the old behaviour.

**New means a user can do something they couldn't before.** A change that makes something behave the way it was always meant to is a fix, however interesting, and stays under Fixes. It can still lead the introduction paragraph.

**Never write "no longer", "now works", or "more reliable" on its own.** Without the situation, a negative makes the product sound broken in general: "Text no longer disappears while you're editing it" tells a reader their text used to vanish, full stop.

Also:

- No PR numbers, links, commit hashes, or issue references. The diff link at the end covers anyone who wants the detail.
- No code identifiers, package names, or mechanisms. If the sentence cannot survive without them, it is not marketing material.
- No emoji. No engineer names.
- Combine commits that form one feature into one bullet.

Good:

- "You can now wrap a single shape in a frame. Select it and choose Frame selection, and the frame fits around it."
- "Mermaid diagrams pasted into tldraw look much closer to Mermaid's own rendering: sequence diagrams keep their participant boxes and colours, notes get enough room, and self-loops sit where you'd expect."
- "Pressing Z right after picking a tool could leave the zoom tool stuck on. It now switches off when you let go."
- "Bookmarks now update their preview when you change their URL."

Bad:

- "Text no longer disappears while you're editing it." — no situation, sounds like text vanished for everyone.
- "Fix selected text vanishing when ProseMirror hides the selection." — commit-title register and a mechanism.
- "Board version history is more reliable behind the scenes." — nothing a user can observe.
- "Frame selection works on a single shape." — a menu name standing in for what it does.
- "Improve Mermaid rendering ([#10813](...), [#10817](...))" — PR links, and a verb-first form written for developers.

### 4. Compose the message

Follow the SDK notes' shape, cut down: an introduction paragraph, then a flat list. No section headers unless there are both new features and fixes, in which case use plain `New` and `Fixes` lines.

The introduction names the one or two things that matter most and the themes of the rest. It does not restate bullets: if a fix leads the intro, the bullet below says it differently or adds the detail. For a fixes-only week, one sentence is enough.

Keep it under 2000 characters (Discord's limit). Sentence case. Write as though the release is going out today.

```
**Shipping to tldraw.com this week**

Mermaid diagrams pasted into tldraw now look much closer to Mermaid's own rendering, and you can wrap a single shape in a frame. The rest is fixes.

New
- You can now wrap a single shape in a frame. Select it and choose Frame selection, and the frame fits around it.
- Mermaid diagrams pasted into tldraw look much closer to Mermaid's own rendering: sequence diagrams keep their participant boxes and colours, notes get enough room, and self-loops sit where you'd expect.

Fixes
- Triple-clicking a bullet to select a whole list made the text vanish. It stays put now.
- Pressing Z right after picking a tool could leave the zoom tool stuck on. It now switches off when you let go.
- Excalidraw drawings with custom stroke widths now paste correctly.
- tldraw.com loads properly on slow connections instead of showing a "Something went wrong" page.

This is a draft for marketing to edit. Full changes: https://github.com/tldraw/tldraw/compare/production...main
```

If nothing user-facing was selected but there were commits, say so briefly ("Quiet week for user-facing changes, mostly under-the-hood work.") and still include the diff link.

### 5. Check the draft

Before posting, read the message once more and confirm:

- every bullet answers "what would a user do to notice this?";
- every fix contains the situation the bug happened in;
- no bullet contains a PR number, link, backticked identifier, package name, or emoji;
- no bullet says "no longer", "now works", or "more reliable" without the situation;
- no bullet reads like a commit title (verb-first `Add`/`Fix`/`Improve`);
- no bullet is over about 30 words;
- New contains only things a user couldn't do before, and no fix is filed there for being interesting;
- no more than two consecutive bullets open with the old behaviour;
- the introduction doesn't repeat a bullet word for word; and
- the whole message is under 2000 characters.

### 6. Post to Discord (or print)

With `--dry-run`, print the finished message to stdout and stop.

Otherwise post the message as the webhook's `content`. Build the JSON safely (do not string-interpolate the message into the JSON by hand — use `jq` so newlines and quotes are escaped):

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
- The SDK release notes for the same PRs are drafted into `apps/docs/content/releases/next.mdx` by the update-release-notes workflow after the production push, so they are not available when this runs. PRs labelled `dotcom` never appear there at all. Write from the commit bodies.
