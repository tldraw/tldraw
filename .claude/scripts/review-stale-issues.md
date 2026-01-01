# Review stale issues

Review closed issues that were auto-closed by the stale bot to determine the appropriate action for each.

## Instructions

For each closed stale issue in `.claude/scripts/stale-issues.md`, spawn a haiku subagent to review the issue and take one of the following actions:

### Actions

1. **Reopen** - If the issue raises an important bug or feature request that is still relevant and unaddressed
2. **Link to existing issue** - If there's an open issue that addresses the same topic, add a comment linking to it
3. **Link to closing PR** - If a PR has already fixed/implemented this, add a comment linking to it and remove the "stale" label
4. **Leave closed** - If the issue is outdated, no longer relevant, or was intentionally ignored

## Subagent prompt template

For each issue, use the following prompt:

```
Review GitHub issue #ISSUE_NUMBER in tldraw/tldraw repository.

1. First, fetch the issue details using: gh issue view ISSUE_NUMBER --repo tldraw/tldraw

2. Search for related issues that might address the same topic:
   - gh issue list --repo tldraw/tldraw --search "KEYWORDS" --state open --limit 10
   - gh issue list --repo tldraw/tldraw --search "KEYWORDS" --state closed --limit 10

3. Search for PRs that might have fixed this:
   - gh pr list --repo tldraw/tldraw --search "KEYWORDS" --state merged --limit 10

4. Based on your research, determine the appropriate action:

   a) If this is an important unaddressed issue that should be reopened:
      - Run: gh issue reopen ISSUE_NUMBER --repo tldraw/tldraw
      - Add a comment explaining why it was reopened

   b) If there's an existing open issue that covers this:
      - Add a comment: gh issue comment ISSUE_NUMBER --repo tldraw/tldraw --body "This appears to be covered by #RELATED_ISSUE"
      - Leave it closed

   c) If a PR has already addressed this:
      - Add a comment: gh issue comment ISSUE_NUMBER --repo tldraw/tldraw --body "This was addressed in #PR_NUMBER"
      - Remove the stale label: gh issue edit ISSUE_NUMBER --repo tldraw/tldraw --remove-label "stale"

   d) If the issue is outdated, too vague, or not actionable:
      - Leave it closed with no action

5. Report your decision and reasoning.
```

## Execution

Run subagents in parallel batches of 5-10 issues at a time to avoid rate limiting. Use the `model: "haiku"` parameter for cost efficiency.

Example:
```
Task tool with subagent_type="general-purpose", model="haiku"
```

## Tracking

After reviewing each issue, update the checkbox in `stale-issues.md` to track progress:
- [x] #1234 Issue title - **reopened** / **linked to #5678** / **closed by #9012** / **left closed**

## Useful scripts

### View issue details

```bash
# View full issue details
gh issue view ISSUE_NUMBER --repo tldraw/tldraw

# View issue with comments
gh issue view ISSUE_NUMBER --repo tldraw/tldraw --comments
```

### Search for related issues

```bash
# Search open issues by keyword
gh issue list --repo tldraw/tldraw --search "KEYWORDS" --state open --limit 20

# Search closed issues by keyword
gh issue list --repo tldraw/tldraw --search "KEYWORDS" --state closed --limit 20

# Search issues by label
gh issue list --repo tldraw/tldraw --label "bug" --state open --limit 20
```

### Search for related PRs

```bash
# Search merged PRs by keyword
gh pr list --repo tldraw/tldraw --search "KEYWORDS" --state merged --limit 20

# Search PRs that mention an issue number
gh pr list --repo tldraw/tldraw --search "ISSUE_NUMBER" --state merged --limit 10
```

### Reopen an issue

```bash
# Reopen the issue
gh issue reopen ISSUE_NUMBER --repo tldraw/tldraw

# Add a comment explaining why
gh issue comment ISSUE_NUMBER --repo tldraw/tldraw --body "Reopening: This issue reports an important bug/feature that is still unaddressed."
```

### Link to a related issue

```bash
# Comment linking to another issue that covers the same topic
gh issue comment ISSUE_NUMBER --repo tldraw/tldraw --body "This appears to be covered by #RELATED_ISSUE. Closing as duplicate."
```

### Link to a closing PR

```bash
# Comment linking to the PR that fixed it
gh issue comment ISSUE_NUMBER --repo tldraw/tldraw --body "This was addressed in #PR_NUMBER."

# Remove the stale label
gh issue edit ISSUE_NUMBER --repo tldraw/tldraw --remove-label "stale"
```

### Batch fetch stale issues

```bash
# Get all open stale issues as JSON
gh issue list --repo tldraw/tldraw --label "stale" --state open --limit 100 --json number,title,url

# Get all closed stale issues as JSON
gh issue list --repo tldraw/tldraw --label "stale" --state closed --limit 100 --json number,title,url

# Get issue numbers only (for scripting)
gh issue list --repo tldraw/tldraw --label "stale" --state closed --limit 100 --json number --jq '.[].number'
```

### Add labels

```bash
# Add a label to an issue
gh issue edit ISSUE_NUMBER --repo tldraw/tldraw --add-label "needs-triage"

# Remove a label from an issue
gh issue edit ISSUE_NUMBER --repo tldraw/tldraw --remove-label "stale"
```

### Close with reason

```bash
# Close as not planned
gh issue close ISSUE_NUMBER --repo tldraw/tldraw --reason "not planned"

# Close as completed
gh issue close ISSUE_NUMBER --repo tldraw/tldraw --reason "completed"
```
