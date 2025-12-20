# Nuggets quality report

Generated: 12/20/2025

This report evaluates all nugget articles in the `/documentation/nuggets` folder against the standards defined in [index.md](./index.md).

## Scoring criteria

- **Readability (0-10)**: How clear and easy to understand is the writing? Does it flow well? Are technical concepts explained accessibly?
- **Potential (0-10)**: How well would this do on a technical blog or Hacker News? Does it tell a compelling story? Would developers outside tldraw find it interesting?
- **Accuracy (0-10)**: Is the story true to the related documentation and source code? Are the technical claims correct? Does it faithfully represent the actual implementation?

## How to run evaluations

To evaluate nugget articles, use Claude Code with this prompt template:

```
You are evaluating nugget article quality. Read the nuggets index at /Users/stephenruiz/Documents/GitHub/tldraw/documentation/nuggets/index.md first to understand what makes a good nugget.

Then read and evaluate each of these nugget files:
1. [file path]
2. [file path]
...

For each file, provide:
- Readability score (0-10): How clear and accessible is the writing? Does it flow well?
- Potential score (0-10): How compelling is this for a technical blog or Hacker News? Would developers outside tldraw care?
- Accuracy score (0-10): Does the story match the source code and related documentation?

To verify accuracy, read:
- The source files mentioned in the nugget's "Key files" section
- Any related documentation in /documentation/features/ or /documentation/architecture/

Return results in this exact format for each file:
FILE: [filename]
READABILITY: [score]
POTENTIAL: [score]
ACCURACY: [score]
NOTES: [brief notes on strengths, issues, or discrepancies found]
---
```

Evaluate nuggets in batches of 5-10 to keep context focused. For accuracy verification, the evaluator should read both the nugget and at least one source file it references.

## How to improve nuggets

Follow this workflow when improving nugget articles:

### Step 1: Improve

Launch a subagent to rewrite the article. Provide the subagent with:

- The current file path
- Current scores and notes from this report
- Reference to the [index.md](./index.md) guide (nugget writing standards)
- Source files mentioned in the nugget's Key files section

Example prompt:

```
You are improving the nugget article for [topic].

**Your task:** Rewrite [file path] to follow the nugget writing standards.

**Current scores:** Readability [X], Potential [X], Accuracy [X]
**Current issues:** [notes from quality report]

**Steps:**
1. Read the current nugget: [file path]
2. Read the nugget writing guide: /Users/stephenruiz/Documents/GitHub/tldraw/documentation/nuggets/index.md
3. Read the source files mentioned in Key files to verify accuracy
4. Read any related documentation in /documentation/features/ or /documentation/architecture/
5. Rewrite the nugget following the guide, ensuring:
   - Opens with the failure mode or problem
   - Code examples illustrate insights, not just implementation
   - Honest about tradeoffs
   - Has a proper conclusion with takeaways
   - Technical claims match the source code
```

### Step 2: Evaluate

Launch a **fresh subagent** to evaluate the improved article using the standard evaluation prompt above. This ensures unbiased scoring—the evaluator should not be the same agent that made the improvements.

### Step 3: Update this report

After evaluation, update this quality report:

1. Update the results table with new scores and notes
2. Recalculate and update summary statistics
3. Move articles between "Highest rated" and "Needs improvement" sections as appropriate
4. Update the "Generated" date at the top of this file

## What makes a high-scoring nugget

**Readability (9-10)**:

- Clear opening that grounds the reader in a concrete problem
- Smooth transitions between concepts
- Technical terms explained or linked
- Code examples that clarify rather than overwhelm

**Potential (9-10)**:

- A genuine insight developers can apply elsewhere
- Problem that's harder than it looks
- Decision that challenges conventional wisdom
- Would generate interesting Hacker News discussion

**Accuracy (9-10)**:

- Technical claims verified against source code
- Code examples match actual implementation
- Tradeoffs and limitations honestly represented
- Key files section points to correct locations

---

## Summary statistics

| Evaluated | Total files | Avg Readability | Avg Potential | Avg Accuracy |
| --------- | ----------- | --------------- | ------------- | ------------ |
| 32        | 32          | 8.9             | 7.8           | 9.3          |

---

## Results

| File                        | Readability | Potential | Accuracy | Notes |
| --------------------------- | ----------- | --------- | -------- | ----- |
| arc-arrows.md               | 9           | 8         | 9        | Strong handle vs body arc distinction. All claims verified. Could show failure mode of naive bezier approach. |
| browser-canvas-size.md      | 9           | 9         | 10       | Model nugget. Probing technique and fast-path optimization are genuinely clever. Strong HN potential. |
| brush-scribble-selection.md | 9           | 8         | 10       | Excellent. Clear progression from algorithms to optimizations. All code verified. Transferable insights. |
| click-state-machine.md      | 9           | 8         | 10       | Excellent. Opens with anti-pattern, shows actual code. All timing values verified. Universal applicability. |
| cross-tab-sync.md           | 9           | 8         | 10       | Strong. Data loss scenario grounds the reader. All timing values verified (350ms debounce, 10s retry). |
| deep-links.md               | 8           | 5         | 9        | Clear writing but problem is straightforward. Lacks "harder than it looks" quality. More documentation than story. |
| edge-scrolling.md           | 9           | 7         | 10       | Solid. Good pointer width insight. All code verified. Well-understood pattern limits HN novelty. |
| elbow-arrows.md             | 8           | 6         | 10       | Accurate and detailed. Transform system is clever. Niche topic limits broader appeal. |
| freehand-ink.md             | 9           | 8         | 10       | Excellent. Averaging algorithm well explained. All code verified. Generalizable SVG smoothing technique. |
| hit-testing.md              | 9           | 8         | 9        | Strong. Distance-not-boolean insight well explained. Minor: describes pointInPolygon as ray casting but uses winding number. |
| image-lod.md                | 8           | 7         | 7        | Good structure. Power-of-two optimization is clever. Accuracy issues: threshold is 500 not 300, code examples don't match source. |
| incremental-bindings.md     | 8           | 7         | 9        | Solid epoch-based diff pattern. Copy-on-write is clever. Missing conclusion paragraph. Minor naming inconsistency. |
| indexeddb-migrations.md     | 9           | 8         | 9        | Excellent. Two-layer versioning well explained. Cross-tab coordination is valuable insight. Minor code simplifications. |
| inky-rng.md                 | 9           | 8         | 9        | Strong. Shape ID as seed is elegant. Xorshift well explained. Minor: code example omits onlyFilled param. |
| jittered-indices.md         | 8           | 7         | 6        | Good structure. ACCURACY ISSUE: Collision rate claim (1 in 47k) is off by orders of magnitude (actual ~1 in 537M with 30 bits). |
| perfect-dash-patterns.md    | 9           | 8         | 10       | Excellent. Clear failure-first approach. All code verified. Universal SVG/graphics problem with elegant solution. |
| pinch-gesture.md            | 9           | 7         | 10       | Clear state machine explanation. All thresholds verified. Niche topic but performance rationale is valuable. |
| png-scale.md                | 9           | 7         | 10       | Perfect accuracy. pHYs chunk and MIME type workaround well explained. Niche but useful for canvas devs. |
| react-canvas.md             | 9           | 10        | 10       | Exemplary. Challenges "React is too slow" wisdom. Clear two-stage update pattern, signals integration, culling logic all verified against source. Strong narrative arc. Minor: conclusion could tie lessons together more explicitly. |
| resize-handles.md           | 9           | 8         | 9        | Strong. SVG cursor embedding is clever. Coordinate transform insight well explained. Minor code simplifications. |
| runtime-validation.md       | 8           | 7         | 9        | Good. Incremental validation pattern is key insight. Performance optimizations verified. Specialized topic. |
| safari-hell.md              | 9           | 8         | 9        | Strong platform quirks documentation. All workarounds verified (font loading 250ms sleep, culled shape reflow, Apple Pencil double-tap). Honest about hacks. Slightly tldraw-specific, limiting broader appeal. |
| scribble-animation.md       | 9           | 7         | 9        | Clear flow. Delay queue mechanism well explained. Minor: slice(-5) comment mismatch with "three" in source. |
| shape-culling.md            | 9           | 7         | 9        | Good failure-first approach. Arrow binding implications interesting. display:none insight valuable. |
| shape-font-loading.md       | 9           | 7         | 10       | Excellent. Microtask batching pattern broadly applicable. Reactive integration well explained. All code verified. |
| signals.md                  | 9           | 9         | 9        | Strong technical writing. Epoch-based invalidation well explained, "why not existing solutions" adds credibility. All code verified. Minor: claims library extracted as "signia" but package is @tldraw/state. |
| state-chart.md              | 9           | 8         | 9        | Strong. Boolean spaghetti opening is effective. XState comparison is insightful. Minor signature simplification. |
| sync.md                     | 9           | 10        | 9        | Excellent. Challenges CRDT conventional wisdom with git-rebase model. Three-outcome model, clock versioning, tombstones all verified. Simplified code accurately represents core algorithm. Highly applicable outside tldraw. |
| text-measurement.md         | 9           | 6         | 9        | Clear writing. Property diffing optimization solid but expected. Range API most interesting part. |
| undo-redo-squashing.md      | 9           | 9         | 10       | Excellent. Mark-based approach is counterintuitive and compelling. All code verified. Highly applicable pattern. |
| wheel-momentum.md           | 9           | 8         | 10       | Strong. use-gesture workaround well documented. Honest about fragility. All code verified exactly. |
| wheel-or-trackpad.md        | 9           | 8         | 9        | Strong. Impossible detection problem with pragmatic UX solution. All code verified. Minor technical nuance. |

---

## Files by score

### Highest rated (25+ total score)

| File                        | Total | R   | P   | A   |
| --------------------------- | ----- | --- | --- | --- |
| react-canvas.md             | 29    | 9   | 10  | 10  |
| browser-canvas-size.md      | 28    | 9   | 9   | 10  |
| sync.md                     | 28    | 9   | 10  | 9   |
| undo-redo-squashing.md      | 28    | 9   | 9   | 10  |
| brush-scribble-selection.md | 27    | 9   | 8   | 10  |
| click-state-machine.md      | 27    | 9   | 8   | 10  |
| cross-tab-sync.md           | 27    | 9   | 8   | 10  |
| freehand-ink.md             | 27    | 9   | 8   | 10  |
| perfect-dash-patterns.md    | 27    | 9   | 8   | 10  |
| signals.md                  | 27    | 9   | 9   | 9   |
| wheel-momentum.md           | 27    | 9   | 8   | 10  |
| arc-arrows.md               | 26    | 9   | 8   | 9   |
| edge-scrolling.md           | 26    | 9   | 7   | 10  |
| hit-testing.md              | 26    | 9   | 8   | 9   |
| indexeddb-migrations.md     | 26    | 9   | 8   | 9   |
| inky-rng.md                 | 26    | 9   | 8   | 9   |
| pinch-gesture.md            | 26    | 9   | 7   | 10  |
| png-scale.md                | 26    | 9   | 7   | 10  |
| resize-handles.md           | 26    | 9   | 8   | 9   |
| safari-hell.md              | 26    | 9   | 8   | 9   |
| shape-font-loading.md       | 26    | 9   | 7   | 10  |
| state-chart.md              | 26    | 9   | 8   | 9   |
| wheel-or-trackpad.md        | 26    | 9   | 8   | 9   |
| scribble-animation.md       | 25    | 9   | 7   | 9   |
| shape-culling.md            | 25    | 9   | 7   | 9   |

### Needs improvement (< 21 total score)

| File | Total | R   | P   | A   |
| ---- | ----- | --- | --- | --- |
| None | -     | -   | -   | -   |

### Borderline (21-24 total score)

| File                    | Total | R   | P   | A   | Issue                                            |
| ----------------------- | ----- | --- | --- | --- | ------------------------------------------------ |
| jittered-indices.md     | 21    | 8   | 7   | 6   | Collision rate claim off by orders of magnitude  |
| deep-links.md           | 22    | 8   | 5   | 9   | Problem too straightforward, lacks story         |
| image-lod.md            | 22    | 8   | 7   | 7   | Code examples don't match source                 |
| elbow-arrows.md         | 24    | 8   | 6   | 10  | Niche topic limits appeal                        |
| incremental-bindings.md | 24    | 8   | 7   | 9   | Missing conclusion                               |
| runtime-validation.md   | 24    | 8   | 7   | 9   | Specialized topic                                |
| text-measurement.md     | 24    | 9   | 6   | 9   | Solution not surprising enough                   |
