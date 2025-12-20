# Nuggets quality report

Generated: 12/20/2025 (Round 8)

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
| 32        | 32          | 9.1             | 8.6           | 9.8          |

---

## Results

| File                        | Readability | Potential | Accuracy | Notes                                                                                                                                                                                                                                 |
| --------------------------- | ----------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| arc-arrows.md               | 9           | 9         | 10       | Improved. Now shows bezier failure mode (chaos from control point ambiguity). Constraint-driven design insight compelling. All geometric claims verified.                                                                             |
| browser-canvas-size.md      | 9           | 9         | 10       | Model nugget. Probing technique and fast-path optimization are genuinely clever. Strong HN potential.                                                                                                                                 |
| brush-scribble-selection.md | 9           | 8         | 10       | Excellent. Clear progression from algorithms to optimizations. All code verified. Transferable insights.                                                                                                                              |
| click-state-machine.md      | 9           | 8         | 10       | Excellent. Opens with anti-pattern, shows actual code. All timing values verified. Universal applicability.                                                                                                                           |
| cross-tab-sync.md           | 9           | 8         | 10       | Strong. Data loss scenario grounds the reader. All timing values verified (350ms debounce, 10s retry).                                                                                                                                |
| deep-links.md               | 9           | 8         | 10       | Improved. Double-encoding insight is compelling. Strong narrative around human-readable URLs. All code verified against source.                                                                                                       |
| edge-scrolling.md           | 9           | 9         | 10       | Improved. Finger width compensation hook is compelling. 0.612 mystery adds intrigue. Two-phase timing well explained. Strong HN potential.                                                                                            |
| elbow-arrows.md             | 9           | 8         | 10       | Improved. Edge-based routing framed as general pattern. Coordinate transformation insight broadly applicable. A\* comparison is compelling.                                                                                           |
| freehand-ink.md             | 9           | 8         | 10       | Excellent. Averaging algorithm well explained. All code verified. Generalizable SVG smoothing technique.                                                                                                                              |
| hit-testing.md              | 9           | 8         | 9        | Strong. Distance-not-boolean insight well explained. Winding number algorithm now correctly described. Compelling for graphics programmers.                                                                                           |
| image-lod.md                | 9           | 8         | 10       | Improved. All code verified. Transparently documents source code discrepancy (JSDoc says 300, default is 500). Skip conditions comprehensive. Strong practical value.                                                                 |
| incremental-bindings.md     | 9           | 8         | 9        | Improved. Epoch-based diff pattern well explained, copy-on-write is clever. Added proper conclusion. Fixed naming inconsistency. Strong HN potential for incremental computation patterns.                                            |
| indexeddb-migrations.md     | 9           | 8         | 9        | Excellent. Two-layer versioning well explained. Cross-tab coordination is valuable insight. Minor code simplifications.                                                                                                               |
| inky-rng.md                 | 9           | 9         | 9        | Improved. Shape ID as seed is elegant. Xorshift tradeoffs well explained. onlyFilled param fixed. Strong broader applicability.                                                                                                       |
| jittered-indices.md         | 9           | 9         | 10       | Improved. All file paths verified. Collision math correct. Unverifiable claims removed. Strong multiplayer insight with high HN potential.                                                                                            |
| perfect-dash-patterns.md    | 9           | 8         | 10       | Excellent. Clear failure-first approach. All code verified. Universal SVG/graphics problem with elegant solution.                                                                                                                     |
| pinch-gesture.md            | 9           | 8         | 10       | Improved. Wait-and-see pattern framed as universal gesture disambiguation technique. State machine diagram clear. All thresholds verified. Strong HN potential.                                                                       |
| png-scale.md                | 9           | 8         | 10       | Restored. Binary section simplified. pHYs chunk and `web ` MIME workaround well explained. All code verified. Strong practical value for clipboard-heavy apps.                                                                        |
| react-canvas.md             | 9           | 10        | 10       | Exemplary. Challenges "React is too slow" wisdom. Clear two-stage update pattern, signals integration, culling logic all verified against source. Strong narrative arc. Minor: conclusion could tie lessons together more explicitly. |
| resize-handles.md           | 9           | 8         | 9        | Strong. SVG cursor embedding is clever. Coordinate transform insight well explained. Minor code simplifications.                                                                                                                      |
| runtime-validation.md       | 9           | 9         | 10       | Revised. Removed formulaic "when to use" checklists. Zod comparison flows naturally. Incremental validation pattern well explained. All performance claims verified.                                                                  |
| safari-hell.md              | 9           | 8         | 9        | Improved. Now framed as universal web platform patterns. Each quirk has "Lesson" takeaways. Honest about hacks ("voodoo", "desperate"). Strong cross-browser reference for any developer.                                             |
| scribble-animation.md       | 9           | 8         | 9        | Improved. Delay queue pattern framed as broadly applicable. Beyond-tldraw examples added. Accuracy issue fixed (slice(-5) matches article).                                                                                           |
| shape-culling.md            | 9           | 8         | 9        | Improved. Counterintuitive "keep invisible elements" insight now leads. Bug report opening compelling. Broader applications (virtual scrolling, maps, canvas editors) well explained.                                                 |
| shape-font-loading.md       | 9           | 8         | 10       | Improved. Microtask batching now leads as hero insight. Beyond-fonts examples added. Event loop timing well explained. All code verified.                                                                                             |
| signals.md                  | 9           | 9         | 9        | Strong technical writing. Epoch-based invalidation well explained, "why not existing solutions" adds credibility. All code verified. Minor: claims library extracted as "signia" but package is @tldraw/state.                        |
| state-chart.md              | 9           | 9         | 10       | Improved. Boolean spaghetti opening effective. Method signatures fixed. XState comparison insightful. Strong HN potential.                                                                                                            |
| sync.md                     | 9           | 10        | 9        | Excellent. Challenges CRDT conventional wisdom with git-rebase model. Three-outcome model, clock versioning, tombstones all verified. Simplified code accurately represents core algorithm. Highly applicable outside tldraw.         |
| text-measurement.md         | 9           | 8         | 9        | Improved. Range API now leads as hero insight. Ellipsis whitespace and RTL detection are compelling. Opens with failure mode.                                                                                                         |
| undo-redo-squashing.md      | 9           | 9         | 10       | Excellent. Mark-based approach is counterintuitive and compelling. All code verified. Highly applicable pattern.                                                                                                                      |
| wheel-momentum.md           | 9           | 8         | 10       | Strong. use-gesture workaround well documented. Honest about fragility. All code verified exactly.                                                                                                                                    |
| wheel-or-trackpad.md        | 9           | 8         | 9        | Strong. Impossible detection problem with pragmatic UX solution. All code verified. Minor technical nuance.                                                                                                                           |

---

## Files by score

### Highest rated (25+ total score)

| File                        | Total | R   | P   | A   |
| --------------------------- | ----- | --- | --- | --- |
| react-canvas.md             | 29    | 9   | 10  | 10  |
| browser-canvas-size.md      | 28    | 9   | 9   | 10  |
| sync.md                     | 28    | 9   | 10  | 9   |
| undo-redo-squashing.md      | 28    | 9   | 9   | 10  |
| runtime-validation.md       | 28    | 9   | 9   | 10  |
| jittered-indices.md         | 28    | 9   | 9   | 10  |
| edge-scrolling.md           | 28    | 9   | 9   | 10  |
| arc-arrows.md               | 28    | 9   | 9   | 10  |
| state-chart.md              | 28    | 9   | 9   | 10  |
| brush-scribble-selection.md | 27    | 9   | 8   | 10  |
| click-state-machine.md      | 27    | 9   | 8   | 10  |
| cross-tab-sync.md           | 27    | 9   | 8   | 10  |
| freehand-ink.md             | 27    | 9   | 8   | 10  |
| perfect-dash-patterns.md    | 27    | 9   | 8   | 10  |
| signals.md                  | 27    | 9   | 9   | 9   |
| wheel-momentum.md           | 27    | 9   | 8   | 10  |
| deep-links.md               | 27    | 9   | 8   | 10  |
| elbow-arrows.md             | 27    | 9   | 8   | 10  |
| image-lod.md                | 27    | 9   | 8   | 10  |
| pinch-gesture.md            | 27    | 9   | 8   | 10  |
| shape-font-loading.md       | 27    | 9   | 8   | 10  |
| png-scale.md                | 27    | 9   | 8   | 10  |
| inky-rng.md                 | 27    | 9   | 9   | 9   |
| hit-testing.md              | 26    | 9   | 8   | 9   |
| scribble-animation.md       | 26    | 9   | 8   | 9   |
| indexeddb-migrations.md     | 26    | 9   | 8   | 9   |
| resize-handles.md           | 26    | 9   | 8   | 9   |
| safari-hell.md              | 26    | 9   | 8   | 9   |
| wheel-or-trackpad.md        | 26    | 9   | 8   | 9   |
| incremental-bindings.md     | 26    | 9   | 8   | 9   |
| text-measurement.md         | 26    | 9   | 8   | 9   |
| shape-culling.md            | 26    | 9   | 8   | 9   |

### Needs improvement (< 21 total score)

| File | Total | R   | P   | A   |
| ---- | ----- | --- | --- | --- |
| None | -     | -   | -   | -   |

### Borderline (21-24 total score)

| File | Total | R   | P   | A   | Issue |
| ---- | ----- | --- | --- | --- | ----- |
| None | -     | -   | -   | -   | -     |
