# Enhanced issue triage implementation guide

This document provides a complete implementation guide for enhancing the `issue-triage.yml` workflow with advanced capabilities.

## Overview

The enhanced triage system adds six major capabilities to the existing workflow:
1. Related issue detection and duplicate identification
2. Milestone assignment based on rules
3. Enhanced codebase surfacing with detailed context
4. Priority estimation and labeling
5. Agent handoff preparation with structured briefs
6. Better integration with other workflows

## Implementation approach

### Enhanced workflow file

Replace `.github/workflows/issue-triage.yml` with the enhanced version below. The key changes:

- Expanded tool access for deeper research
- Multi-stage triage process
- Structured output format for downstream agents
- Integration hooks for other workflows

```yaml
name: Issue Triage

on:
  issues:
    types: [opened]
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number to triage (for testing)'
        required: true
        type: number

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      id-token: write
    env:
      ISSUE_NUMBER: ${{ github.event.issue.number || inputs.issue_number }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Get issue details
        id: issue
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh issue view ${{ env.ISSUE_NUMBER }} --json title,body,labels,state,author,createdAt > /tmp/issue.json
          echo "details<<EOF" >> $GITHUB_OUTPUT
          cat /tmp/issue.json >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Search for related issues
        id: related
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          # Get all open issues for similarity comparison
          gh issue list --limit 100 --state open --json number,title,body,labels > /tmp/related-issues.json
          echo "related_issues<<EOF" >> $GITHUB_OUTPUT
          cat /tmp/related-issues.json >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Enhanced Triage with Claude
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            You are an enhanced issue triage bot for the tldraw repository. Perform comprehensive triage on issue #${{ env.ISSUE_NUMBER }}.

            ## Issue details
            ```json
            ${{ steps.issue.outputs.details }}
            ```

            ## Related open issues (for duplicate detection)
            ```json
            ${{ steps.related.outputs.related_issues }}
            ```

            ## Triage tasks

            ### 1. Classify the issue type
            Determine if this is a:
            - **Bug**: Something is broken or not working as designed (crashes, rendering errors, data loss)
            - **Improvement**: A request to enhance existing behavior (UX preferences, "I wish X worked like Y")
            - **Feature**: A request for entirely new functionality
            - **Task**: Internal team task
            - **Example**: Request for a new SDK example

            IMPORTANT: Many issues filed as "bugs" are actually improvement requests. A true bug is something objectively broken.

            ### 2. Detect related and duplicate issues
            - Compare the title and description with the related issues provided
            - Look for similar bug reports, related feature requests, or duplicates
            - Identify if this is a clear duplicate (>90% similarity in issue and symptoms)
            - Find related issues that provide useful context (similar area, related feature)

            ### 3. Research affected codebase areas
            Use the codebase exploration tools to:
            - Identify the specific files and functions related to this issue
            - Find relevant test files that might need updates
            - Locate documentation or examples that relate to the issue
            - Provide specific file paths with line numbers when possible

            For bug reports, be especially thorough:
            - Find where the bug is likely occurring
            - Identify related code paths
            - Suggest test cases that should reproduce the issue

            ### 4. Estimate priority
            Analyze and assign a priority based on:
            - **P0 (Critical)**: Data loss, security issues, complete feature breakage affecting all users
            - **P1 (High)**: Significant functionality broken, affects many users, no workaround
            - **P2 (Medium)**: Functionality impaired but has workaround, affects some users
            - **P3 (Low)**: Minor issues, nice-to-have improvements, affects few users

            Consider:
            - How many users are likely affected?
            - Is there a workaround?
            - Does this block other work?
            - Is this a regression or long-standing issue?

            ### 5. Apply labels
            Add appropriate labels using `gh issue edit --add-label`:

            **Area labels:**
            - `sdk` - Affects @tldraw/tldraw package
            - `dotcom` - Related to tldraw.com
            - `docs` - Documentation changes
            - `examples` - SDK example requests
            - `performance` - Performance issues
            - `a11y` - Accessibility issues

            **Type labels:**
            - `bugfix` - Confirmed bugs (use only for TRUE bugs)
            - `feature` - New features
            - `improvement` - Product improvements (use this for UX preferences)

            **Priority labels:**
            - `P0` - Critical priority
            - `P1` - High priority
            - `P2` - Medium priority
            - `P3` - Low priority

            **Status labels:**
            - `More Info Needed` - Issue lacks critical info to understand/reproduce
            - `duplicate` - Clear duplicate of another issue

            ### 6. Suggest milestone (comment only, don't assign)
            Based on the priority and issue type, suggest which milestone this should be in:
            - P0/P1 bugs → Current sprint milestone
            - P2 bugs → Next sprint milestone
            - Features → Roadmap milestone or backlog

            Note: Only suggest in your comment, do not use gh CLI to assign milestones.

            ## Output format

            Post a comprehensive triage comment using `gh issue comment` with this structure:

            ```markdown
            ## Triage summary
            - **Type**: [Bug|Feature|Improvement|Task|Example]
            - **Priority**: [P0|P1|P2|P3] - [Brief justification]
            - **Area**: [Specific subsystem, e.g., "Editor → Selection → Arrow bindings"]
            - **Affected users**: [Estimate: All|Many|Some|Few]
            - **Workaround available**: [Yes|No|Partial]

            ## Related issues
            [If any duplicates or related issues found, list them with links and brief descriptions]
            - Possible duplicate: #XXXX - [Brief description of similarity]
            - Related: #YYYY - [How it relates]
            - See also: #ZZZZ - [Additional context]

            [If this is a clear duplicate:]
            **🔄 This appears to be a duplicate of #XXXX**

            ## Affected code
            [Based on codebase research, list relevant files and functions]
            - `path/to/file.ts:123` - [Description of relevance]
            - `path/to/tests.test.ts` - [Related test file]

            ## For bug reports: Reproduction analysis
            [If this is a bug, analyze the reproduction steps]
            - **Reproduction**: [Clear|Needs more info|Cannot reproduce]
            - **Root cause hypothesis**: [Your analysis of what might be wrong]
            - **Suggested investigation**: [Where to start debugging]

            ## Implementation guidance
            [For features/improvements, suggest approach]
            1. [Step 1]
            2. [Step 2]
            3. [Step 3]

            ## Suggested milestone
            [Your milestone recommendation with reasoning]

            ## For implementing agents
            [Structured brief to help future AI agents or developers pick this up]
            - **Ready for implementation**: [Yes|Needs design|Needs more info]
            - **Key files to modify**: [List]
            - **Test strategy**: [What tests to add/modify]
            - **Documentation impact**: [Yes|No - what needs updating]

            ---
            *🤖 Automated triage by Claude Code*
            ```

            ## Execution steps

            1. **Analyze the issue** - Read and understand the request
            2. **Detect duplicates** - Compare with related issues, identify clear duplicates
            3. **Research codebase** - Use Glob, Grep, and Read to find relevant code
            4. **Classify and prioritize** - Determine type and priority
            5. **Apply labels** - Use `gh issue edit --add-label "label1,label2,label3"` to add all labels at once
            6. **Post triage comment** - Use `gh issue comment` to post the comprehensive analysis
            7. **Handle duplicates** - If this is a clear duplicate, add a comment suggesting closure and linking to the original

            ## Special handling

            **For clear duplicates:**
            - Add the `duplicate` label
            - Post a comment like: "This issue appears to be a duplicate of #XXXX. Please continue the discussion there. Closing as duplicate."
            - Close the issue with: `gh issue close ${{ env.ISSUE_NUMBER }} --reason duplicate --comment "Duplicate of #XXXX"`

            **For issues needing more info:**
            - Add the `More Info Needed` label
            - In your comment, specifically list what information is missing
            - Suggest what the user should provide (reproduction steps, environment details, screenshots, etc.)

            IMPORTANT: Always post your comprehensive triage comment. This is crucial for maintainers and future implementing agents.
          claude_args: '--allowedTools "Bash(gh issue:*),Bash(gh api:*),Read,Glob,Grep,Task,Write,WebSearch"'
```

## Key enhancements explained

### 1. Related issue detection

The workflow now fetches the last 100 open issues and passes them to Claude for similarity analysis. Claude can:
- Identify duplicates based on title/description similarity
- Find related issues in the same area
- Auto-close clear duplicates with appropriate linking

### 2. Milestone assignment

While Claude cannot directly assign milestones (would require additional permissions), it now:
- Suggests appropriate milestones in the triage comment
- Bases suggestions on priority and issue type
- Provides reasoning for the suggestion
- Maintainers can quickly assign based on the suggestion

### 3. Enhanced codebase surfacing

With expanded tool access (including `Task` for deep exploration), Claude can:
- Use Glob to find related files by pattern
- Use Grep to search for relevant code
- Use Read to examine specific implementations
- Provide specific file paths with line numbers
- Identify related test files
- Link to relevant documentation

### 4. Priority estimation

The new priority system (P0-P3) is based on:
- Impact analysis (how many users affected)
- Severity assessment (data loss, complete breakage, minor annoyance)
- Workaround availability
- Blocking status
- Clear labels for easy filtering

### 5. Agent handoff preparation

The structured triage comment now includes an "For implementing agents" section with:
- Implementation readiness status
- Key files to modify
- Test strategy
- Documentation impact
- Clear reproduction steps (for bugs)
- Suggested implementation approach (for features)

This makes it easy for:
- Future AI agents to pick up the work
- Human developers to start implementation
- Maintainers to assign work appropriately

### 6. Integration improvements

**Coordination with `claude.yml`:**
- Triage runs first on issue creation
- When a user later mentions `@claude`, that agent can read the triage comment
- The triage comment provides structured context for the implementing agent
- No conflicts since triage doesn't respond to @claude mentions

**Coordination with `close-stale-issues.yml`:**
- Issues with `keep` label won't be closed (this is already implemented)
- Consider adding `P0` and `P1` labels to the exempt list
- Triage could add `keep` label to critical issues automatically

**New integration possibilities:**
- Could trigger a notification workflow for P0 issues
- Could auto-assign to specific team members based on area labels
- Could create Linear issues automatically for P0/P1 priorities

## Testing the enhanced workflow

### Manual testing via workflow_dispatch

```bash
# Test triage on a specific issue
gh workflow run issue-triage.yml -f issue_number=1234
```

### Test scenarios to validate

1. **Duplicate detection**: Create test issue similar to existing one
2. **Priority assignment**: Create P0 (critical) and P3 (minor) test issues
3. **Codebase research**: Create bug report about specific feature
4. **Label application**: Verify all label types are applied correctly
5. **Comment structure**: Verify markdown formatting and completeness

## Rollout recommendations

### Phase 1: Deploy and monitor (Week 1-2)
1. Deploy the enhanced workflow
2. Monitor triage quality on new issues
3. Gather feedback from maintainers
4. Track false positive duplicate detections

### Phase 2: Refinement (Week 3-4)
1. Adjust priority estimation rules based on feedback
2. Refine duplicate detection thresholds
3. Improve codebase research prompts
4. Add any missing area labels

### Phase 3: Integration (Week 5+)
1. Connect triage with project management (Linear, etc.)
2. Add automated notifications for P0/P1 issues
3. Create metrics dashboard for triage effectiveness
4. Consider adding auto-assignment rules

## Monitoring and metrics

Track these metrics to measure triage effectiveness:

- **Accuracy**: % of issues where triage classification was correct
- **Duplicate detection rate**: % of duplicates caught automatically
- **Priority accuracy**: % of priority assignments that maintainers agree with
- **Time saved**: Estimate of maintainer time saved on initial classification
- **Agent handoff success**: % of issues where implementing agent successfully used triage info

## Future enhancements

Consider adding in future iterations:

1. **Sentiment analysis**: Detect frustrated users and flag for priority response
2. **Complexity estimation**: Estimate development effort (small/medium/large)
3. **Automatic reproduction**: For bugs, attempt to create minimal repro
4. **Impact scoring**: Combine multiple factors into numeric impact score
5. **Smart notifications**: Notify specific maintainers based on expertise areas
6. **Triage feedback loop**: Learn from maintainer corrections to improve

## Tool access expansion

The enhanced workflow needs these additional tools:

- `Task` - For deep codebase exploration
- `Write` - For creating reproduction test cases (optional)
- `WebSearch` - For researching external dependencies or similar issues (optional)

Current tool access:
```
--allowedTools "Bash(gh issue:*),Bash(gh api:*),Read,Glob,Grep,Task,Write,WebSearch"
```

## Rate limiting and costs

**GitHub API:**
- Current: ~3 API calls per triage (get issue, list issues, post comment)
- Enhanced: ~5-10 API calls per triage (additional searches, label updates)
- Well within GitHub's rate limits for Actions

**Anthropic API:**
- Current: ~1,000-2,000 tokens per triage
- Enhanced: ~5,000-10,000 tokens per triage (more context, deeper research)
- Consider using `claude-sonnet-4` for cost optimization if needed
- Estimated cost: $0.015-0.030 per issue (negligible at current issue volume)

## Security considerations

The enhanced workflow:
- Still has read-only access to repository contents
- Can only modify issues (labels, comments, status)
- Cannot modify code or workflows
- Cannot push commits or create PRs
- Uses scoped GitHub tokens with minimal permissions

No additional security risks introduced by enhancements.
