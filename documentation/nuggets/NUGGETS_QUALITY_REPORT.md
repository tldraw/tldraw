# Nuggets quality report

Generated: 12/20/2025 (Full re-evaluation with Voice scores)

This report evaluates all nugget articles in the `/documentation/nuggets` folder against the standards defined in [VOICE.md](./VOICE.md) (writing style) and [index.md](./index.md) (structure).

## Scoring criteria

- **Readability (0-10)**: How clear and easy to understand is the writing? Does it flow well? Are technical concepts explained accessibly?
- **Voice (0-10)**: Does it sound like tldraw? Starts with our experience, uses "we" for tldraw decisions, avoids AI tells (hollow importance claims, trailing gerunds, formulaic transitions, rule of three, promotional language).
- **Potential (0-10)**: How well would this do on a technical blog or Hacker News? Does it tell a compelling story? Would developers outside tldraw find it interesting?
- **Accuracy (0-10)**: Is the story true to the related documentation and source code? Are the technical claims correct? Does it faithfully represent the actual implementation?

## How to run evaluations

To evaluate nugget articles, use Claude Code with this prompt template:

```
You are evaluating nugget article quality.

First, read these guides:
1. /Users/stephenruiz/Documents/GitHub/tldraw/documentation/nuggets/VOICE.md - Writing style, especially the "Nuggets" and "Avoiding AI writing tells" sections
2. /Users/stephenruiz/Documents/GitHub/tldraw/documentation/nuggets/index.md - Article structure

Then read and evaluate each of these nugget files:
1. [file path]
2. [file path]
...

For each file, provide:
- Readability score (0-10): How clear and accessible is the writing? Does it flow well?
- Voice score (0-10): Does it sound like tldraw? Check for:
  - Opens with our experience ("When we added...", "We wanted...")
  - Uses "we" for tldraw decisions, "you" for the reader
  - No AI tells: hollow importance claims, trailing gerunds, formulaic transitions, rule of three lists, promotional language, em dash overuse
- Potential score (0-10): How compelling is this for a technical blog or Hacker News? Would developers outside tldraw care?
- Accuracy score (0-10): Does the story match the source code and related documentation?

To verify accuracy, read:
- The source files mentioned in the nugget's "Key files" section
- Any related documentation in /documentation/features/ or /documentation/architecture/

Return results in this exact format for each file:
FILE: [filename]
READABILITY: [score]
VOICE: [score]
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
- Reference to [VOICE.md](./VOICE.md) (writing style) and [index.md](./index.md) (structure)
- Source files mentioned in the nugget's Key files section

Example prompt:

```
You are improving the nugget article for [topic].

**Your task:** Rewrite [file path] to follow the tldraw voice and nugget standards.

**Current scores:** Readability [X], Voice [X], Potential [X], Accuracy [X]
**Current issues:** [notes from quality report]

**Steps:**
1. Read the current nugget: [file path]
2. Read the voice guide: /Users/stephenruiz/Documents/GitHub/tldraw/documentation/nuggets/VOICE.md
   - Pay attention to "Nuggets (tech blog posts)" section for opening pattern
   - Pay attention to "Avoiding AI writing tells" for language to avoid
3. Read the structure guide: /Users/stephenruiz/Documents/GitHub/tldraw/documentation/nuggets/index.md
4. Read the source files mentioned in Key files to verify accuracy
5. Rewrite the nugget:
   - Open with our experience ("When we added...", "We wanted...")
   - Use "we" for tldraw decisions, "you" for the reader
   - Remove AI tells: hollow importance claims, trailing gerunds, formulaic transitions, rule of three, promotional language
   - Ground the reader first (failure mode for Problem→Solution, context for How it works)
   - Conclusion adds perspective, don't just summarize
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

**Voice (9-10)**:

- Opens with our experience ("When we added...", "We wanted...")
- Uses "we" for tldraw decisions, "you" for the reader
- No hollow importance claims ("serves as a testament", "plays a crucial role")
- No trailing gerund phrases ("...ensuring optimal performance")
- No formulaic transitions ("Moreover," "Furthermore," "It's important to note")
- No rule-of-three lists unless the count is actually three
- No promotional language ("robust," "seamless," "empowers")
- Em dashes used sparingly, not constantly

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

| Evaluated | Total files | Avg Readability | Avg Voice | Avg Potential | Avg Accuracy |
| --------- | ----------- | --------------- | --------- | ------------- | ------------ |
| 33        | 33          | 8.5             | 8.3       | 7.5           | 9.8          |

---

## Results

| File                        | Readability | Voice | Potential | Accuracy | Notes                                                                                               |
| --------------------------- | ----------- | ----- | --------- | -------- | --------------------------------------------------------------------------------------------------- |
| arc-arrows.md               | 9           | 9     | 8         | 10       | Strong opening with bezier failure mode. Uses "we" appropriately. No AI tells.                      |
| browser-canvas-size.md      | 9           | 9     | 7         | 10       | Strong technical writing. No AI tells. Probing technique well explained.                            |
| brush-scribble-selection.md | 9           | 8     | 7         | 9        | "Here's why that distinction matters" slightly announcement-y. Good dual approach explanation.      |
| click-state-machine.md      | 9           | 9     | 8         | 10       | Excellent "timeout spaghetti" opening. State machine pattern instructive.                           |
| cross-tab-sync.md           | 8           | 7     | 7         | 10       | Bolded section labels feel ChatGPT-ish. localStorage section feels tacked on.                       |
| deep-links.md               | 9           | 8     | 8         | 10       | Double-encoding insight compelling. Conclusion feels slightly summarize-y.                          |
| edge-scrolling.md           | 8           | 8     | 6         | 9        | Weaker opening—starts with solution before establishing problem. 0.612 mystery engaging.            |
| elbow-arrows.md             | 8           | 7     | 9         | 9        | Formulaic "Takeaways" section with bolded headers. Coordinate transformation genuinely clever.      |
| fairies.md                  | 9           | 9     | 9         | 9        | Rewritten. Opens with our experience. Coordinate offsetting technique compelling. Honest tradeoffs. |
| freehand-ink.md             | 9           | 8     | 7         | 10       | Minor AI tells: "elegant in its simplicity", "The key insight is that". Averaging trick clear.      |
| hit-testing.md              | 9           | 9     | 8         | 10       | Excellent failure-mode-first opening. "Try the naive approach" engages reader.                      |
| image-lod.md                | 8           | 8     | 7         | 10       | Minor: "dramatically faster" leans promotional. Power-of-two stepping well explained.               |
| incremental-bindings.md     | 7           | 7     | 6         | 10       | Opening could be punchier. Uses em dashes frequently. Copy-on-write section excellent.              |
| indexeddb-migrations.md     | 8           | 8     | 7         | 10       | Good server vs client opening. Some formulaic transitions. Honest about nuclear option.             |
| inky-rng.md                 | 9           | 9     | 6         | 10       | Concise and well-structured. No AI tells. Pattern is well-known, less surprising.                   |
| jittered-indices.md         | 9           | 9     | 8         | 10       | Opens with tldraw's experience. Birthday bound adds credibility. Production collision story good.   |
| perfect-dash-patterns.md    | 9           | 10    | 7         | 10       | Perfect voice. Opens exactly as guide recommends ("When we added...").                              |
| pinch-gesture.md            | 9           | 9     | 8         | 10       | Excellent opening ("Two fingers touch the screen"). No AI tells.                                    |
| png-scale.md                | 8           | 7     | 7         | 10       | "Why this matters beyond tldraw" section with bullet list slightly templated.                       |
| react-canvas.md             | 9           | 8     | 9         | 10       | "The result" section header slightly formulaic. Challenges "React is too slow" wisdom.              |
| resize-handles.md           | 8           | 8     | 6         | 10       | XOR flip logic elegant. Niche appeal—rotation + resize specific.                                    |
| runtime-validation.md       | 7           | 6     | 8         | 10       | "Why not just use Zod?" is templated header. "Validation as security" feels like add-on.            |
| safari-hell.md              | 9           | 9     | 8         | 10       | Perfect nugget structure. Honest about hacks ("This is pure voodoo").                               |
| scribble-animation.md       | 8           | 7     | 7         | 10       | "The delay queue pattern" heading slightly templated. "Beyond tldraw" section borderline.           |
| shape-culling.md            | 10          | 10    | 9         | 10       | Outstanding. Perfect tldraw voice. Opens with bug that motivates solution.                          |
| shape-font-loading.md       | 9           | 9     | 8         | 10       | "The trick is `queueMicrotask`" is natural. Excellent technical writing.                            |
| signals.md                  | 8           | 7     | 9         | 9        | Has "Moreover" transition. Feature comparison checklist feel. Epoch-based invalidation excellent.   |
| state-chart.md              | 9           | 9     | 8         | 10       | Opens perfectly with boolean spaghetti. "Why not XState?" honest and pragmatic.                     |
| sync.md                     | 8           | 8     | 10        | 9        | "This is powerful for..." is promotional. Git analogy brilliant. Challenges CRDT wisdom.            |
| text-measurement.md         | 9           | 10    | 7         | 10       | Outstanding voice. No AI tells. Range API trick surprising.                                         |
| undo-redo-squashing.md      | 9           | 9     | 7         | 10       | Clear mark-based undo explanation. No AI tells.                                                     |
| wheel-momentum.md           | 8           | 9     | 6         | 10       | Honest, direct. GOTCHA comment reproduced from source. Very niche workaround.                       |
| wheel-or-trackpad.md        | 9           | 9     | 7         | 10       | "Asking users beats guessing" pragmatic conclusion. Systematically dismantles heuristics.           |

---

## Files by score

### Highest rated (36+ total)

| File                     | Total | R   | V   | P   | A   |
| ------------------------ | ----- | --- | --- | --- | --- |
| shape-culling.md         | 39    | 10  | 10  | 9   | 10  |
| text-measurement.md      | 36    | 9   | 10  | 7   | 10  |
| perfect-dash-patterns.md | 36    | 9   | 10  | 7   | 10  |
| arc-arrows.md            | 36    | 9   | 9   | 8   | 10  |
| click-state-machine.md   | 36    | 9   | 9   | 8   | 10  |
| fairies.md               | 36    | 9   | 9   | 9   | 9   |
| hit-testing.md           | 36    | 9   | 9   | 8   | 10  |
| pinch-gesture.md         | 36    | 9   | 9   | 8   | 10  |
| jittered-indices.md      | 36    | 9   | 9   | 8   | 10  |
| shape-font-loading.md    | 36    | 9   | 9   | 8   | 10  |
| safari-hell.md           | 36    | 9   | 9   | 8   | 10  |
| state-chart.md           | 36    | 9   | 9   | 8   | 10  |
| react-canvas.md          | 36    | 9   | 8   | 9   | 10  |

### Strong (33-35 total)

| File                        | Total | R   | V   | P   | A   |
| --------------------------- | ----- | --- | --- | --- | --- |
| browser-canvas-size.md      | 35    | 9   | 9   | 7   | 10  |
| undo-redo-squashing.md      | 35    | 9   | 9   | 7   | 10  |
| wheel-or-trackpad.md        | 35    | 9   | 9   | 7   | 10  |
| inky-rng.md                 | 34    | 9   | 9   | 6   | 10  |
| freehand-ink.md             | 34    | 9   | 8   | 7   | 10  |
| deep-links.md               | 35    | 9   | 8   | 8   | 10  |
| sync.md                     | 35    | 8   | 8   | 10  | 9   |
| signals.md                  | 33    | 8   | 7   | 9   | 9   |
| elbow-arrows.md             | 33    | 8   | 7   | 9   | 9   |
| brush-scribble-selection.md | 33    | 9   | 8   | 7   | 9   |
| image-lod.md                | 33    | 8   | 8   | 7   | 10  |
| indexeddb-migrations.md     | 33    | 8   | 8   | 7   | 10  |
| wheel-momentum.md           | 33    | 8   | 9   | 6   | 10  |

### Adequate (30-32 total)

| File                    | Total | R   | V   | P   | A   | Issue                                          |
| ----------------------- | ----- | --- | --- | --- | --- | ---------------------------------------------- |
| cross-tab-sync.md       | 32    | 8   | 7   | 7   | 10  | Bolded section labels feel ChatGPT-ish         |
| resize-handles.md       | 32    | 8   | 8   | 6   | 10  | Niche appeal                                   |
| scribble-animation.md   | 32    | 8   | 7   | 7   | 10  | Templated section headers                      |
| png-scale.md            | 32    | 8   | 7   | 7   | 10  | "Beyond tldraw" bullet list slightly templated |
| runtime-validation.md   | 31    | 7   | 6   | 8   | 10  | Templated headers, add-on feeling              |
| edge-scrolling.md       | 31    | 8   | 8   | 6   | 9   | Weaker opening                                 |
| incremental-bindings.md | 30    | 7   | 7   | 6   | 10  | Opening could be more engaging                 |

### Needs improvement (< 30 total)

None currently.
