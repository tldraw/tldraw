---
name: issue
description: Create and research a GitHub issue in the tldraw repository from a user description. Use when the user invokes issue, asks to create an issue, report a bug, file a feature request, or add research to a new issue.
---

# Issue

Create a GitHub issue on `tldraw/tldraw` from a user description, then research it.

Use `../write-issue/SKILL.md` as the standards reference for issue titles, bodies, types, labels, and triage conventions.

At the top of the issue, include the user's original description verbatim. Annotate it with the human emoji, separated from your work by a horizontal rule. Example:

```
🧑: {user_description}

---
```

## Underspecified issues

Many issues arrive as a one-liner, and the original text may be everything the creator has in their head. Your job is to add useful context, not to invent a specification they never gave. A wrong inference is worse than an open question: it sends an implementer with less context down the wrong path while reading like settled scope.

Throughout investigation and research, keep two things separate:

- **Codebase facts** — a file does X, this code path runs on Y. You confirm these by reading; state them plainly.
- **Intent and scope** — what the creator wants, which behavior is correct, what the fix should be. This is inference; never present it as fact.

Gate how far you expand on your confidence in the intent:

- **High confidence (≥95%)** that the original text has one clear reading and the codebase confirms it: expand normally — describe the problem, root cause, and a concrete approach.
- **Anything less:** do not commit to a single interpretation. Capture what's ambiguous as open questions and lay out the possible approaches with their tradeoffs, so the creator can come back and specify. Add the `More Info Needed` label.

When in doubt, prefer questions over assumptions. This drives step 2 (assess specification), step 4 (open questions in the body), and step 9 (verified-vs-inferred research); format the body per `../write-issue/SKILL.md`.

## Workflow

1. Gather context:
   - User's issue description.
   - Current branch: `git branch --show-current`.
   - Recent issues: `gh issue list --repo tldraw/tldraw --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"'`.
2. Do a quick codebase investigation:
   - Search for relevant files, functions, or patterns mentioned in the description.
   - Identify likely affected packages, apps, or examples.
   - Note obvious causes, related issues, or existing code paths.
   - Assess how well-specified the issue is (see underspecified issues above). Note where the original text has more than one reasonable reading.
3. For visual bugs, identify a reproduction target when possible:
   - Examples app: `localhost:5420` from `yarn dev`.
   - tldraw.com app: `localhost:3000` from `yarn dev-app`.
   - Docs site: `localhost:3001` from `yarn dev-docs`.
   - If screenshots are useful but not feasible locally, ask the user for screenshots and specific reproduction details.
4. Write the issue title and body using `../write-issue/SKILL.md`. Keep the original text verbatim at the top. If the issue is underspecified, add a short `## Open questions` section to the body listing what the creator needs to clarify, and add the `More Info Needed` label.
5. Create the issue:

```bash
gh issue create --repo tldraw/tldraw --title "..." --body "..."
```

6. Set the issue type through GitHub GraphQL when possible, since `gh issue create --type` is not reliable across versions.
7. Assign a milestone only when there is a clear fit:
   - `Improve developer resources` for examples, documentation, comments, starter kits, and `npm create tldraw`.
   - `Improve automations` for GitHub Actions, review bots, CI/CD, and automation work.
8. Share the issue URL with the user immediately after creation.
9. Do deeper research after creation. Structure the findings so a reader can tell verified facts from inference:
   - **What I found** (verified) — relevant files and line numbers, code paths, architecture context, related code, and the root cause for bugs you can confirm.
   - **Interpretation** — how you are reading the original text, and exactly where it is ambiguous.
   - **Possible approaches** — when the intent is clear (≥95%), one recommended approach. When it is not, two or three options with their tradeoffs, not a single confident pick.
   - **Open questions** — what the creator should answer to unblock implementation (mirror or expand the body's open questions).
   - Note edge cases, testing needs, and likely implementation risks.
10. Add the research as an issue comment:

```bash
gh issue comment <issue-number> --repo tldraw/tldraw --body "..."
```

## Rules

- Always create the issue before doing deep research so the user can track it.
- Never present inferred intent as fact — when unsure, capture open questions and alternative approaches instead of guessing.
- Follow `../write-issue/SKILL.md` for all content standards, including issue types, labels, and AI attribution.
