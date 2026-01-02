# Issue triage enhancement implementation guide

This guide explains how to implement the enhanced issue triage system for the tldraw repository.

## Overview

The enhanced triage system extends the current `issue-triage.yml` workflow with 6 major capabilities:

1. **Duplicate detection** - Automatically find and link related issues
2. **Milestone assignment** - Auto-assign issues to appropriate milestones
3. **Enhanced codebase surfacing** - Provide detailed code context with file paths
4. **Priority estimation** - Classify issues by impact and urgency
5. **Agent handoff preparation** - Structure output for downstream AI agents
6. **Integration improvements** - Better coordination with other workflows

## Prerequisites

### 1. Add priority labels to repository

The enhanced workflow uses priority labels that need to be created:

```bash
# Add these labels via GitHub UI or gh CLI:
gh label create "priority: critical" --description "P0 - Critical issues requiring immediate attention" --color "d93f0b"
gh label create "priority: high" --description "P1 - High priority issues for current/next milestone" --color "e99695"
gh label create "priority: medium" --description "P2 - Medium priority issues for backlog" --color "f9d0c4"
gh label create "priority: low" --description "P3 - Low priority improvements and edge cases" --color "fef2c0"
```

### 2. Ensure milestones are configured (optional)

If you want automatic milestone assignment:
- Create active milestones in GitHub (e.g., "v2.10.0", "v2.11.0", "Backlog")
- The workflow will automatically detect and use them
- If milestones aren't in use, this feature will be skipped gracefully

## Implementation steps

### Option A: Replace existing workflow (recommended)

1. **Backup current workflow**:
   ```bash
   cp .github/workflows/issue-triage.yml .github/workflows/issue-triage.yml.backup
   ```

2. **Replace with enhanced version**:
   ```bash
   cp .github/workflows/issue-triage-enhanced.yml .github/workflows/issue-triage.yml
   ```

3. **Commit and push**:
   ```bash
   git add .github/workflows/issue-triage.yml
   git commit -m "feat: enhance issue triage with duplicate detection and priority estimation"
   git push
   ```

### Option B: Run in parallel for testing

1. **Keep both workflows** to test the enhanced version alongside the current one:
   - Current workflow: `.github/workflows/issue-triage.yml` (keep as-is)
   - Enhanced workflow: `.github/workflows/issue-triage-enhanced.yml` (already created)

2. **Test using workflow_dispatch**:
   ```bash
   # Trigger enhanced triage on an existing issue
   gh workflow run issue-triage-enhanced.yml -f issue_number=1234
   ```

3. **Compare results** and switch when satisfied

## What changed from the original workflow

### Tool additions

| Tool | Purpose | Example usage |
|------|---------|---------------|
| `Bash(gh search issues:*)` | Find duplicates and related issues | `gh search issues "arrow bindings" --state open` |
| `Bash(gh pr list:*)` | Find related pull requests | `gh pr list --search "arrow bindings" --state all` |
| Expanded `Bash(gh api:*)` | Access milestones and other API endpoints | `gh api repos/tldraw/tldraw/milestones` |

### Prompt enhancements

The enhanced prompt includes:

1. **8-step workflow** (vs. 2 steps in original):
   - Search for duplicates
   - Search for related PRs
   - Classify issue type
   - Estimate priority
   - Research codebase
   - Apply labels
   - Assign milestone
   - Write structured summary

2. **Priority classification system** (P0-P3):
   - Clear criteria for each priority level
   - Impact-based decision making
   - Automatic `keep` label for P0/P1 issues

3. **Structured output format**:
   - Triage summary section
   - Affected code section with file paths
   - Context for implementation section
   - Agent handoff section

4. **Duplicate detection logic**:
   - Search both open and closed issues
   - Flag duplicates without auto-closing
   - Link related issues for context

### Example output

Here's what a triage comment will look like:

```markdown
## Triage summary
- **Type**: Bug
- **Priority**: P2 - Feature partially broken but workaround available
- **Area**: @tldraw/editor → Selection → Arrow bindings
- **Duplicate status**: Related to #5432 (similar binding issue)
- **Related PRs**: #5678 (merged in v2.4.0, might be regression)

## Affected code
- `packages/editor/src/lib/editor/managers/BindingManager.ts:234-267` - Binding update logic
- `packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.tsx:456` - Arrow binding implementation
- `packages/editor/src/lib/editor/Editor.test.ts:890` - Existing binding tests
- See example: https://tldraw.dev/examples/shapes/bindings

## Context for implementation
- **Reproduction**: Rotate a shape with arrow binding, then move it
- **Root cause hypothesis**: Binding positions not recalculated after rotation transform
- **Suggested approach**:
  1. Check `updateBindings()` in BindingManager for rotation handling
  2. Verify transform matrix application in binding position calculation
  3. Add test case for rotated shapes with bindings
- **Test files to update**: `packages/editor/src/lib/editor/Editor.test.ts`
- **Related documentation**: Bindings architecture in tldraw.dev

## For implementing agents
**Status**: Ready for implementation
This issue has clear reproduction steps and identified code paths. The binding system is well-tested, so follow existing patterns in BindingManager.test.ts.
```

## Integration with other workflows

### Coordination with `claude.yml`

The `claude.yml` workflow handles `@claude` mentions. The enhanced triage can:
- Flag complex issues that might benefit from @claude investigation
- Structure output to make it easy for @claude to pick up the work
- Avoid duplicate work by not adding comments on issues already handled by @claude

### Coordination with `close-stale-issues.yml`

The stale issue workflow closes issues inactive for 150+ days. The enhanced triage:
- Automatically adds `keep` label to P0/P1 issues to prevent closure
- Helps prioritize which issues should remain open long-term
- Provides better context for maintainers deciding which stale issues to keep

## Testing the enhanced workflow

### 1. Test with workflow_dispatch

```bash
# Test on a recent bug report
gh workflow run issue-triage-enhanced.yml -f issue_number=7500

# Test on a feature request
gh workflow run issue-triage-enhanced.yml -f issue_number=7450

# Test on an issue that might be a duplicate
gh workflow run issue-triage-enhanced.yml -f issue_number=7400
```

### 2. Verify expected behavior

Check that the workflow:
- ✅ Searches for duplicate issues
- ✅ Searches for related PRs
- ✅ Applies correct type labels (bugfix/feature/improvement)
- ✅ Applies correct priority labels (priority: critical/high/medium/low)
- ✅ Applies correct area labels (sdk/dotcom/performance/a11y)
- ✅ Posts structured triage comment
- ✅ Assigns milestone (if applicable)
- ✅ Adds `keep` label for P0/P1 issues

### 3. Monitor for issues

Watch for:
- API rate limiting (if triaging many issues rapidly)
- Token usage (longer prompts use more tokens)
- False positive duplicates (tune search keywords if needed)
- Incorrect priority assignments (refine criteria if needed)

## Customization options

### Adjust priority criteria

Edit the priority classification section in the workflow file to match your team's needs:

```yaml
**Priority: Critical (P0)**
- [Your custom criteria]

**Priority: High (P1)**
- [Your custom criteria]
```

### Modify structured output format

Adjust the output template in the "Write structured triage summary" section:

```yaml
```markdown
## Triage summary
[Your custom format]
```
```

### Add custom labels

Add more area-specific labels in the "Apply labels" section:

```yaml
**Custom area labels:**
- `multiplayer` - Sync/collaboration issues
- `export` - Image/video export issues
```

### Adjust tool permissions

Add or remove tools in the `claude_args` section:

```yaml
claude_args: '--allowedTools "Bash(gh issue:*),Bash(gh search issues:*),YourCustomTool"'
```

## Advanced features

### Projects API integration (future enhancement)

If you want to integrate with GitHub Projects instead of milestones:

1. Add projects API permission:
   ```yaml
   permissions:
     contents: read
     issues: write
     id-token: write
     projects: write  # Add this
   ```

2. Add projects tool access:
   ```yaml
   claude_args: '--allowedTools "...,Bash(gh project:*)"'
   ```

3. Update prompt to include project assignment logic

### Automatic @claude escalation

For very complex issues, you could add logic to automatically mention @claude:

```bash
# In the workflow, after triage:
if [issue meets complexity criteria]; then
  gh issue comment ${{ env.ISSUE_NUMBER }} --body "@claude This issue needs detailed investigation"
fi
```

## Troubleshooting

### Issue: Workflow fails with permission error

**Solution**: Verify that the workflow has the correct permissions:
```yaml
permissions:
  contents: read
  issues: write
  id-token: write
```

### Issue: Labels not found

**Solution**: Create the priority labels (see Prerequisites section)

### Issue: Duplicate detection finding too many false positives

**Solution**: The Claude agent is using broad search terms. You can:
1. Adjust the duplicate detection logic in the prompt
2. Add instructions to be more selective about what qualifies as a duplicate
3. Increase the similarity threshold

### Issue: Priority assignments seem incorrect

**Solution**: Review and refine the priority criteria in the prompt based on your team's priorities

### Issue: Triage comments too verbose

**Solution**: Edit the structured output template to be more concise

## Monitoring and metrics

To track triage effectiveness:

1. **Label usage**: Monitor how often each priority label is applied
2. **Duplicate detection rate**: Track how many duplicates are found
3. **Time to close**: Measure if better triage leads to faster resolution
4. **Agent pickup rate**: See how often @claude successfully implements triaged issues

## Future enhancements

Potential improvements for v2:

1. **Machine learning for duplicate detection** - Use embeddings for semantic similarity
2. **Automatic severity escalation** - Track issue age and engagement
3. **Community contribution matching** - Suggest issues for contributors based on expertise
4. **Automated reproduction** - Spin up StackBlitz/CodeSandbox for bug reports
5. **Integration with Linear** - Sync priorities and milestones
6. **Triage quality scoring** - Measure accuracy of classifications over time

## Questions?

For issues with this enhancement:
1. Check the [Claude Code Action documentation](https://github.com/anthropics/claude-code-action)
2. Review the [GitHub Actions debugging guide](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/about-monitoring-and-troubleshooting)
3. Open an issue with the `automation` label

---

**Document version**: 1.0
**Last updated**: 2026-01-02
**Maintainer**: Issue triage system
