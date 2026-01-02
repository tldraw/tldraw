# Enhanced issue triage - Changes summary

This document provides a quick overview of what changed between the current and enhanced issue triage workflows.

## Quick comparison

| Feature | Current | Enhanced |
|---------|---------|----------|
| **Type classification** | ✅ Yes | ✅ Yes (unchanged) |
| **Label application** | ✅ Basic labels | ✅ Extended with priority labels |
| **Duplicate detection** | ❌ No | ✅ Automatic similarity analysis |
| **Codebase research** | ⚠️ Limited | ✅ Deep exploration with Task agent |
| **Priority estimation** | ❌ No | ✅ P0-P3 with justification |
| **Related issue linking** | ❌ No | ✅ Automatic detection and linking |
| **Milestone suggestions** | ❌ No | ✅ Rule-based suggestions |
| **Agent handoff prep** | ❌ No | ✅ Structured implementation briefs |
| **Triage comments** | ❌ Silent (no comments) | ✅ Comprehensive triage summary |

## New capabilities

### 1. Related issue detection
**What it does:**
- Fetches last 100 open issues
- Compares title and description similarity
- Identifies duplicates (>90% match)
- Finds related issues in same area
- Auto-closes clear duplicates with linking

**Value:**
- Reduces duplicate work
- Connects related discussions
- Helps users find existing solutions
- Maintains cleaner issue backlog

### 2. Priority labels (P0-P3)
**What it does:**
- Analyzes impact (how many users affected)
- Considers severity (data loss, breakage, annoyance)
- Checks for workarounds
- Assigns P0 (critical) through P3 (low)
- Provides justification in comment

**Value:**
- Easy filtering by priority
- Clear severity indicators
- Helps with sprint planning
- Automated initial prioritization

### 3. Enhanced codebase surfacing
**What it does:**
- Uses Task agent for deep exploration
- Searches codebase with Glob/Grep
- Reads relevant files
- Provides specific file:line references
- Identifies related test files
- Links to examples and docs

**Value:**
- Faster issue resolution
- Better context for developers
- Easier for AI agents to implement
- Reduces research time

### 4. Milestone suggestions
**What it does:**
- Suggests milestone based on priority
- P0/P1 → Current sprint
- P2 → Next sprint
- Features → Roadmap/backlog
- Explains reasoning

**Value:**
- Speeds up planning
- Consistent milestone assignment
- Reduces manual triage time

### 5. Comprehensive triage comments
**What it does:**
- Posts detailed triage analysis
- Structured markdown format
- Includes all findings
- Visible to all users

**Value:**
- Transparency in triage
- Context for future work
- Helps users understand status
- Enables agent handoff

### 6. Agent handoff preparation
**What it does:**
- "For implementing agents" section
- Lists key files to modify
- Suggests test strategy
- Notes documentation impact
- Provides implementation approach

**Value:**
- AI agents can pick up work easily
- Developers have clear starting point
- Reduces ramp-up time
- Structured implementation plan

## New labels introduced

Add these labels to your repository:

**Priority labels:**
- `P0` - Critical (red)
- `P1` - High (orange)
- `P2` - Medium (yellow)
- `P3` - Low (green)

These work alongside existing labels (sdk, dotcom, bugfix, feature, etc.)

## Tool access changes

**Current tools:**
```
Bash(gh issue:*), Bash(gh api:*), Read, Glob, Grep, Task, Write
```

**Enhanced tools (recommended):**
```
Bash(gh issue:*), Bash(gh api:*), Read, Glob, Grep, Task, Write, WebSearch
```

**New additions:**
- `Task` - Already present, now actively used for deep codebase exploration
- `Write` - Already present, could be used for reproduction test cases
- `WebSearch` - New, optional for researching external issues/dependencies

## Output format changes

### Current (no comment)
The current workflow only updates labels silently. Users see:
- Labels appear on issue
- No explanation of triage decisions
- No context for maintainers

### Enhanced (detailed comment)
The enhanced workflow posts a structured comment:

```markdown
## Triage summary
- **Type**: Bug
- **Priority**: P2 - Affects some users but has workaround
- **Area**: Editor → Selection → Brush
- **Affected users**: Some
- **Workaround available**: Yes

## Related issues
- Similar to: #5432 - Selection issues with specific shapes
- Related: #6789 - Brush tool refactor

## Affected code
- `packages/editor/src/lib/editor/tools/SelectTool/childStates/Brushing.ts:45` - Brush selection logic
- `packages/editor/src/test/selection.test.ts` - Selection test suite

## For bug reports: Reproduction analysis
- **Reproduction**: Clear from issue description
- **Root cause hypothesis**: Brush bounds calculation may not account for rotation
- **Suggested investigation**: Check getBrushBounds() method

## Implementation guidance
1. Review brush bounds calculation in Brushing.ts
2. Add test case for rotated shape selection
3. Update brush geometry calculation if needed

## Suggested milestone
Next sprint (P2 priority, moderate impact)

## For implementing agents
- **Ready for implementation**: Yes
- **Key files to modify**: Brushing.ts, selection.test.ts
- **Test strategy**: Add test case for brush selecting rotated shapes
- **Documentation impact**: No - internal bug fix

---
*🤖 Automated triage by Claude Code*
```

## Migration path

### Step 1: Add priority labels
```bash
gh label create P0 --color d73a4a --description "Critical priority"
gh label create P1 --color f97316 --description "High priority"
gh label create P2 --color fbbf24 --description "Medium priority"
gh label create P3 --color 22c55e --description "Low priority"
```

### Step 2: Test on a single issue
```bash
# Run enhanced triage on a test issue
gh workflow run issue-triage.yml -f issue_number=1234
```

### Step 3: Review triage output
- Check the triage comment quality
- Verify labels are applied correctly
- Confirm priority estimation is reasonable
- Test duplicate detection accuracy

### Step 4: Deploy to production
Replace `.github/workflows/issue-triage.yml` with the enhanced version.

### Step 5: Monitor and refine
- Track triage quality over first 2 weeks
- Gather maintainer feedback
- Adjust priority thresholds if needed
- Refine duplicate detection sensitivity

## Cost implications

**Current:** ~$0.003 per issue (1-2K tokens)
**Enhanced:** ~$0.020 per issue (5-10K tokens)

At 50 issues/month:
- Current: $0.15/month
- Enhanced: $1.00/month
- **Increase: $0.85/month**

This is negligible compared to the maintainer time saved.

## Performance impact

**Current:** ~10-15 seconds per triage
**Enhanced:** ~20-30 seconds per triage

The extra 10-15 seconds provide:
- Duplicate detection
- Deep codebase research
- Priority analysis
- Comprehensive documentation

Still well within acceptable limits for automated triage.

## Rollback plan

If issues arise:
1. Revert to original `issue-triage.yml`
2. Keep priority labels (useful for manual triage)
3. Extract learnings from enhanced comments
4. Refine prompts offline
5. Test again with improvements

## Success metrics

Track these to measure enhancement value:

**Triage quality:**
- % of issues where priority matches maintainer judgment
- % of duplicates correctly identified
- % of codebase references that were helpful

**Time savings:**
- Avg. time to first maintainer response (should decrease)
- Maintainer time spent on initial triage (should decrease)
- % of issues that need triage revision (should decrease)

**Agent effectiveness:**
- % of triaged issues successfully implemented by AI agents
- Time from triage to PR for agent-implemented issues
- % of agent PRs that needed substantial revision

## Next steps

1. ✅ Review this summary document
2. ⬜ Create priority labels in repository
3. ⬜ Test enhanced workflow on 3-5 existing issues
4. ⬜ Review test triage comments with team
5. ⬜ Gather feedback and adjust prompts
6. ⬜ Deploy to production
7. ⬜ Monitor for 2 weeks
8. ⬜ Collect metrics and iterate

## Questions or concerns?

If you have questions about the enhancements:
- Check `docs/enhanced-issue-triage-implementation.md` for details
- Review `docs/enhanced-issue-triage.yml` for the complete workflow
- Test on a single issue before full deployment
- Start with a subset of enhancements if preferred

You can always deploy incrementally:
- Phase 1: Just add priority labels and comprehensive comments
- Phase 2: Add duplicate detection
- Phase 3: Add milestone suggestions
- Phase 4: Add agent handoff preparation
