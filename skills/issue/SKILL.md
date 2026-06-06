---
name: issue
description: Create a GitHub issue in the tldraw repository from a user description, then mature it through follow-up questions. Use when the user invokes issue, asks to create an issue, report a bug, file a feature request, or answers follow-up questions for an issue created by this skill.
---

# Issue

Create a GitHub issue on `tldraw/tldraw` from a user description, then interrogate the user to capture enough of their intent for the issue to be worked on.

Use `../write-issue/SKILL.md` as the standards reference for issue titles, bodies, types, labels, and triage conventions.

The goal is not to research the codebase to death. It is to capture the user's full intent and context in the issue, so that whoever (or whatever) picks it up later has what they need. You do this by creating the issue immediately, writing a brief readback of the problem, and then asking the user the questions that would sharpen that understanding.

## Issue body shape

The body always starts with the user's original description, verbatim, annotated with the human emoji and separated from the rest by a horizontal rule:

```
🗣️: {user_description}

---

{two to five sentences that read back your understanding of the problem, expected behavior, and scope}

## Open questions

1. **{question}**
   _Awaiting answer._
2. **{question}**
   _Awaiting answer._

Confidence: {n}%, {ready_status}.
```

- The readback paragraph is the agent's understanding of the problem. It should be short enough for the user to quickly correct, but specific enough to make the intended behavior clear. Keep it product-facing: no code blocks, no long implementation analysis, and no line-by-line diagnosis.
- Include code context only when it helps the issue get picked up, and keep it as a brief inline note in the readback rather than a separate section. Prefer file/function references over snippets or line-by-line diagnosis.
- Keep product intent ahead of code diagnosis. Separate what the user has confirmed, what the code appears to do, and what you are hypothesizing. Do not present a root cause or fix direction as fact unless it is verified or the user has confirmed that framing.
- Each open question targets a specific gap in intent or context. Avoid questions you could answer yourself by looking at the code.
- Keep questions atomic. Do not bundle user-intent questions with implementer-verifiable technical checks. If the user answers only part of a compound question, keep the remaining part open only when it still needs the user's intent or context.
- Prefer omitting implementer-verifiable unknowns over asking the user to verify them. If an unknown is useful context, keep it as a short sentence in the readback, e.g. "Pen input and dash-style coverage are unverified." Ask only when the user's own context or intent matters.
- Prefix a question with `Critical:` inside the bold, e.g. `**Critical: Which package should we rename?**`, only when it is genuinely blocking — the issue cannot be worked on at all until it is answered. Most issues have none; do not inflate ordinary gaps into critical ones.
- As the user answers, replace `_Awaiting answer._` with their answer (lightly cleaned up) directly beneath the question, revise the readback, and add or drop unanswered questions as needed.
- If the user chooses not to answer a non-critical question, replace `_Awaiting answer._` with `_Deferred by user; not blocking implementation._`. Do not use this for critical questions.
- The confidence line is a plain-text status line, not a section. It reflects whether the issue contains enough of the user's context and intent to be worked on, not confidence in the eventual fix. Use a short status phrase such as `ready to get started`, `still need more information`, or `blocked on a critical question`.

## Workflow

1. Gather context:
   - User's issue description.
   - Current branch: `git branch --show-current`.
   - Recent issues: `gh issue list --repo tldraw/tldraw --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"'`.
2. Do a quick codebase investigation, just enough to ground your readback and ask sharp questions:
   - Search for relevant files, functions, or patterns mentioned in the description.
   - Identify likely affected packages, apps, or examples.
   - Note related issues, existing code paths, and possible causes.
   - Distinguish observed code facts from product intent and from hypotheses about the fix.
   - Anything you can answer yourself this way should not become an open question.
3. For visual bugs, identify a reproduction target when possible:
   - Examples app: `localhost:5420` from `yarn dev`.
   - tldraw.com app: `localhost:3000` from `yarn dev-app`.
   - Docs site: `localhost:3001` from `yarn dev-docs`.
   - If the user provided an image and you have a path or URL for it, embed or attach it in the GitHub issue.
   - If the image is visible only in the chat and cannot be attached, describe it as visual context. Do not write "screenshot attached" unless the issue actually contains the image.
   - If screenshots are useful but not feasible locally and the user has not provided one, make a screenshot request one of your open questions.
4. Write the issue title and body using `../write-issue/SKILL.md`. The body follows the shape above: verbatim description, readback paragraph, open questions, and the confidence status line.
5. Create the issue:

```bash
gh issue create --repo tldraw/tldraw --title "..." --body "..."
```

6. Set the issue type (`Bug`, `Feature`, `Example`, or `Task`) — `gh issue create --type` is unreliable, so use the script:

```bash
skills/issue/scripts/set-issue-type.sh <issue-number> <type-name>
```
7. Assign a milestone only when there is a clear fit:
   - `Improve developer resources` for examples, documentation, comments, starter kits, and `npm create tldraw`.
   - `Improve automations` for GitHub Actions, review bots, CI/CD, and automation work.
8. Manage the `More Info Needed` label consistently:
   - Add it only when a critical question is unanswered or the confidence line says the issue still needs more information.
   - Remove it when the issue is ready to get started, even if non-blocking considerations remain.
9. Respond to the user with the issue URL, your readback, and the list of open questions. Ask them directly, leading with any critical question.
10. Interrogate the user. After each reply:
   - Update the issue body: write the user's answer beneath the relevant question, revise the readback, recompute the confidence status line, and add or drop questions as their answers reveal new gaps or close old ones.
   - Reconsider the issue's framing in light of the new context. If an answer changes what the issue actually is, update the title (`gh issue edit --title`), the issue type (the script from step 6), or its labels to match — for example, when a reported bug turns out to be a feature request, or the real problem is narrower than the title suggests.
   - If the user corrects your framing, especially with phrases like "actually" or "well actually," treat it as a signal to rewrite the readback around the corrected distinction. Remove or soften obsolete assumptions before asking more questions.

```bash
gh issue edit <issue-number> --repo tldraw/tldraw --body "..."
```

   - Keep going, one round at a time, until the readback and question answers hold enough of the user's intent and context to be worked on.
11. The issue is ready when no critical question is unanswered and it holds enough of the user's intent to be worked on. Never declare it ready while a critical question is open, regardless of how complete the rest is.
   - Low-priority questions the user has chosen to defer may stay open; readiness does not require answering them. Mark them as `_Deferred by user; not blocking implementation._` rather than leaving `_Awaiting answer._` placeholders.
   - When ready, remove the `More Info Needed` label, tell the user the issue can be picked up, and set the confidence line accordingly, e.g. `Confidence: 84%, ready to get started.` Leave the readback, every question, and the confidence line in the issue as a record of the discussion. Do not delete them.

## Rules

- Always create the issue before interrogating the user, so they can track it from the first reply.
- Ask only questions that capture the user's intent or context. Do not offload work you could do yourself.
- Update the issue after every reply rather than batching answers at the end.
