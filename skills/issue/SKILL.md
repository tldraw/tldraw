---
name: issue
description: Create a GitHub issue in the tldraw repository from a user description, then mature it through follow-up questions. Use when the user invokes issue, asks to create an issue, report a bug, or file a feature request.
---

# Issue

Create a GitHub issue on `tldraw/tldraw` from a user description, then interrogate the user to capture enough of their intent for the issue to be worked on.

Use `../write-issue/SKILL.md` as the standards reference for issue titles, bodies, types, labels, and triage conventions.

The goal is not to research the codebase to death. It is to capture the user's full intent and context in the issue, so that whoever (or whatever) picks it up later has what they need. You do this by creating the issue immediately, scoring your confidence in it, and then asking the user the questions that would raise that confidence.

## Issue body shape

The body always starts with the user's original description, verbatim, annotated with the human emoji and separated from the rest by a horizontal rule:

```
🗣️: {user_description}

---

## Confidence: {n}%

{one or two sentences on what is still missing or uncertain about the user's intent}

## Open questions

1. **{question}**
   _Awaiting answer._
2. **{question}**
   _Awaiting answer._
```

- The confidence score reflects how confident you are that the issue contains enough of the user's context and intent to be worked on, not how confident you are about the fix.
- Each open question targets a specific gap in intent or context. Avoid questions you could answer yourself by looking at the code.
- Prefix a question with `Critical:` inside the bold, e.g. `**Critical: Which package should we rename?**`, only when it is genuinely blocking — the issue cannot be worked on at all until it is answered. Most issues have none; do not inflate ordinary gaps into critical ones. While any critical question is unanswered, cap the confidence score low (at most ~40%) no matter how complete the rest is.
- As the user answers, replace `_Awaiting answer._` with their answer (lightly cleaned up) directly beneath the question, recompute the confidence score, and add or drop unanswered questions as needed.

## Workflow

1. Gather context:
   - User's issue description.
   - Current branch: `git branch --show-current`.
   - Recent issues: `gh issue list --repo tldraw/tldraw --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"'`.
2. Do a quick codebase investigation, just enough to ground your confidence score and ask sharp questions:
   - Search for relevant files, functions, or patterns mentioned in the description.
   - Identify likely affected packages, apps, or examples.
   - Note obvious causes, related issues, or existing code paths.
   - Anything you can answer yourself this way should not become an open question.
3. For visual bugs, identify a reproduction target when possible:
   - Examples app: `localhost:5420` from `yarn dev`.
   - tldraw.com app: `localhost:3000` from `yarn dev-app`.
   - Docs site: `localhost:3001` from `yarn dev-docs`.
   - If screenshots are useful but not feasible locally, make a screenshot request one of your open questions.
4. Write the issue title and body using `../write-issue/SKILL.md`. The body follows the shape above: verbatim description, confidence score, and open questions.
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
8. Respond to the user with the issue URL and the list of open questions. Ask them directly, leading with any critical question.
9. Interrogate the user. After each reply:
   - Update the issue body: write the user's answer beneath the relevant question, recompute the confidence score, and add or drop questions as their answers reveal new gaps or close old ones.
   - Reconsider the issue's framing in light of the new context. If an answer changes what the issue actually is, update the title (`gh issue edit --title`), the issue type (the script from step 6), or its labels to match — for example, when a reported bug turns out to be a feature request, or the real problem is narrower than the title suggests.

```bash
gh issue edit <issue-number> --repo tldraw/tldraw --body "..."
```

   - Keep going, one round at a time, until you are confident the issue holds enough of the user's intent and context to be worked on.
10. The issue is ready when no critical question is unanswered and it holds enough of the user's intent to be worked on. Low-priority questions the user has chosen to defer may stay open — readiness does not require answering them. Never declare it ready while a critical question is open, regardless of how complete the rest is. When ready, raise the confidence score to reflect it and tell the user the issue can be picked up. Leave every question — answered or intentionally deferred — in the issue as a record of the discussion. Do not delete the confidence or open questions sections.

## Rules

- Always create the issue before interrogating the user, so they can track it from the first reply.
- Ask only questions that capture the user's intent or context. Do not offload work you could do yourself.
- Update the issue after every reply rather than batching answers at the end.
