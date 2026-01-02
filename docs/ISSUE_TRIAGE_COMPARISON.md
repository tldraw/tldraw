# Issue triage enhancement comparison

This document compares the current and enhanced issue triage workflows.

## Side-by-side comparison

| Feature | Current workflow | Enhanced workflow |
|---------|-----------------|-------------------|
| **Duplicate detection** | ❌ None | ✅ Searches open/closed issues, links related |
| **Related PR detection** | ❌ None | ✅ Finds PRs that might address the issue |
| **Priority classification** | ❌ None | ✅ P0-P3 with clear criteria |
| **Milestone assignment** | ❌ Manual | ✅ Auto-assigns based on priority |
| **Codebase analysis** | ✅ Basic (for bugs) | ✅ Enhanced with file paths and line numbers |
| **Structured output** | ❌ No comment | ✅ Comprehensive triage summary |
| **Agent handoff** | ❌ No preparation | ✅ Structured context for implementing agents |
| **Stale issue prevention** | ❌ None | ✅ Auto-adds `keep` label for P0/P1 |
| **Label application** | ✅ Type and area | ✅ Type, area, and priority |
| **Test file identification** | ❌ None | ✅ Links related test files |
| **Documentation links** | ❌ None | ✅ Links to relevant docs/examples |

## Tool access comparison

### Current workflow tools

```yaml
Bash(gh issue:*)    # View and edit issues
Bash(gh api:*)      # GitHub API access (limited)
Read                # Read files
Glob                # Find files by pattern
Grep                # Search file contents
Task                # Launch sub-agents
Write               # Create files
```

### Enhanced workflow tools (additions in bold)

```yaml
Bash(gh issue:*)           # View and edit issues
Bash(gh search issues:*)   # 🆕 Search for duplicates
Bash(gh pr list:*)         # 🆕 Find related PRs
Bash(gh api:*)             # GitHub API access (expanded for milestones)
Read                       # Read files
Glob                       # Find files by pattern
Grep                       # Search file contents
Task                       # Launch sub-agents
Write                      # Create files
```

## Prompt comparison

### Current workflow steps

1. Classify the issue type (Bug vs Feature vs Improvement)
2. Apply labels (sdk, dotcom, performance, etc.)

**Total prompt length**: ~1,200 characters

### Enhanced workflow steps

1. Search for duplicates and related issues
2. Search for related PRs
3. Classify the issue type
4. Estimate priority (P0-P3)
5. Research codebase (for bugs)
6. Apply labels (type + area + priority)
7. Assign milestone (if applicable)
8. Write structured triage summary

**Total prompt length**: ~6,800 characters

## Label system comparison

### Current labels

**Type labels:**
- `bugfix` - Bugs
- `feature` - Features
- `improvement` - Improvements
- `example` - Examples

**Area labels:**
- `sdk`, `dotcom`, `docs`, `examples`
- `performance`, `a11y`
- `More Info Needed`

**Total**: ~10 labels

### Enhanced labels (additions needed)

**Type labels:** (same as current)
- `bugfix`, `feature`, `improvement`, `example`

**Area labels:** (same as current)
- `sdk`, `dotcom`, `docs`, `examples`
- `performance`, `a11y`
- `More Info Needed`

**Priority labels:** (NEW)
- `priority: critical` (P0)
- `priority: high` (P1)
- `priority: medium` (P2)
- `priority: low` (P3)

**Special labels:** (NEW)
- `keep` - Prevent stale closure (auto-added for P0/P1)

**Total**: ~15 labels

## Output comparison

### Current workflow output

**Location**: GitHub issue metadata only (labels)

**What's added**:
- Type labels (bugfix/feature/improvement)
- Area labels (sdk/dotcom/performance/etc.)

**What's NOT added**:
- No comments on the issue
- No duplicate detection
- No priority indication
- No code analysis results

### Enhanced workflow output

**Location**: GitHub issue metadata + comment

**What's added to metadata**:
- Type labels (bugfix/feature/improvement)
- Area labels (sdk/dotcom/performance/etc.)
- Priority labels (priority: critical/high/medium/low)
- `keep` label (for P0/P1 to prevent stale closure)
- Milestone assignment (based on priority)

**What's added as comment**:
```markdown
## Triage summary
- Type, priority, area
- Duplicate status
- Related PRs

## Affected code
- File paths with line numbers
- Related test files
- Documentation links

## Context for implementation
- Reproduction steps
- Root cause hypothesis
- Suggested approach
- Test files to update

## For implementing agents
- Implementation readiness status
- Any blockers or dependencies
```

## Performance comparison

| Metric | Current | Enhanced | Notes |
|--------|---------|----------|-------|
| **Execution time** | ~30-60s | ~60-120s | Enhanced does more API calls and code analysis |
| **API calls** | 2-5 | 8-15 | Duplicate search, PR search, milestone lookup |
| **Token usage** | ~2,000-5,000 | ~8,000-15,000 | Longer prompt + more context |
| **Rate limiting risk** | Low | Low-Medium | More API calls but within limits |

## Cost comparison

Assuming average token usage:

| Workflow | Tokens per run | Cost per run (Sonnet 4.5)* | Monthly cost (30 issues/month) |
|----------|----------------|----------------------------|--------------------------------|
| **Current** | ~3,500 tokens | ~$0.01 | ~$0.30 |
| **Enhanced** | ~12,000 tokens | ~$0.04 | ~$1.20 |

*Based on Claude Sonnet 4.5 pricing ($3/MTok input, $15/MTok output)

**Analysis**: Enhanced workflow costs ~4x more per issue but provides significantly more value. For a typical month with 30 new issues, the additional cost is less than $1.

## Value proposition

### What you get with the enhanced workflow

1. **Reduced duplicate issues** - Catch duplicates early, link related issues
2. **Better prioritization** - Clear P0-P3 system helps focus efforts
3. **Faster implementation** - Structured context helps agents/developers start faster
4. **Better issue quality** - Triage comments improve issue documentation
5. **Automatic maintenance** - P0/P1 issues protected from stale closure
6. **Related work visibility** - Links to related PRs and issues
7. **Code path identification** - Specific files and line numbers for bugs
8. **Agent-ready issues** - Prepared for AI-assisted implementation

### Migration recommendation

**For most teams**: ✅ **Strongly recommended**

The enhanced workflow provides significant value for minimal additional cost:
- Better issue organization
- Faster resolution times
- Improved developer/agent experience
- Automatic quality improvements

**Start with**: Parallel testing (Option B in implementation guide)
- Run enhanced workflow alongside current workflow
- Compare outputs on 5-10 recent issues
- Switch fully after validation

**Don't migrate if**:
- You have very high issue volume (>200/month) and cost is critical
- You have custom triage processes that conflict
- You need sub-10-second triage times

## Maintenance comparison

| Task | Current | Enhanced |
|------|---------|----------|
| **Label management** | 10 labels | 15 labels (+5 priority labels) |
| **Workflow updates** | Rare | Rare |
| **Prompt tuning** | As needed | May need priority criteria tuning |
| **Monitoring** | Label usage | Label usage + triage quality |
| **False positives** | N/A | May need duplicate detection tuning |

## Integration comparison

### Current workflow integration

- **Standalone** - No integration with other workflows
- **Manual handoff** - Maintainers manually review and assign
- **No stale protection** - All issues subject to stale closure

### Enhanced workflow integration

- **Claude.yml coordination** - Can escalate to @claude for complex issues
- **Stale prevention** - Auto-protects P0/P1 from closure
- **Milestone sync** - Coordinates with project planning
- **Agent handoff** - Prepares issues for AI implementation
- **PR tracking** - Links to related development work

## Rollback plan

If you need to revert to the current workflow:

```bash
# Restore from backup
cp .github/workflows/issue-triage.yml.backup .github/workflows/issue-triage.yml

# Or revert the commit
git revert [commit-hash]
git push
```

No data is lost - labels and comments remain on issues even if you switch back.

## Conclusion

The enhanced workflow is a **significant upgrade** that provides:
- 6 major new capabilities
- Better issue organization
- Faster resolution times
- Improved developer and agent experience

**Recommended action**: Implement using Option B (parallel testing), then switch after validation.

---

**Document version**: 1.0
**Last updated**: 2026-01-02
