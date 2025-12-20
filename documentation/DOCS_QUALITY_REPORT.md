# Documentation quality report

Generated: 12/20/2024

This report evaluates all documentation files in the `/documentation` folder against the standards defined in [HOW_TO_WRITE_DOCUMENTATION.md](./HOW_TO_WRITE_DOCUMENTATION.md).

## How to run evaluations

To re-run quality evaluations on documentation files, use Claude Code with this prompt template:

```
You are evaluating documentation quality. Read the HOW_TO_WRITE_DOCUMENTATION.md guide at /Users/stephenruiz/Documents/GitHub/tldraw/documentation/HOW_TO_WRITE_DOCUMENTATION.md first to understand the standards.

Then read and evaluate each of these documentation files:
1. [file path]
2. [file path]
...

For each file, provide:
- Readability score (0-10): How clear and easy to understand is the writing?
- Structure score (0-10): Does it follow proper document structure (Overview, sections, Key files, Related)?
- Conformance score (0-10): How well does it follow the HOW_TO_WRITE_DOCUMENTATION.md guide (sentence case headings, frontmatter, active voice, conciseness)?

Return results in this exact format for each file:
FILE: [relative path from documentation/]
READABILITY: [score]
STRUCTURE: [score]
CONFORMANCE: [score]
NOTES: [brief notes on issues or strengths]
---
```

Group files by category (architecture, packages, guides, etc.) and run separate evaluations for each group to keep context focused.

## How to improve documentation

Follow this workflow when improving documentation articles:

### Step 1: Improve

Launch a subagent to rewrite the article. Provide the subagent with:

- The current file path
- Current scores and notes from this report
- Reference to the [HOW_TO_WRITE_DOCUMENTATION.md](./HOW_TO_WRITE_DOCUMENTATION.md) guide
- The package's CONTEXT.md file if available (for package docs)

Example prompt:

```
You are improving the documentation for [package/topic].

**Your task:** Rewrite [file path] to follow the documentation standards.

**Current scores:** Readability [X], Structure [X], Conformance [X]
**Current issues:** [notes from quality report]

**Steps:**
1. Read the current documentation: [file path]
2. Read the documentation guide: /Users/stephenruiz/Documents/GitHub/tldraw/documentation/HOW_TO_WRITE_DOCUMENTATION.md
3. Read the CONTEXT.md if available: [context path]
4. Read source files to understand the topic better
5. Rewrite the documentation following the guide

**Required sections for [doc type]:**
- [list expected sections from HOW_TO_WRITE_DOCUMENTATION.md]
```

### Step 2: Evaluate

Launch a **fresh subagent** to evaluate the improved article using the standard evaluation prompt above. This ensures unbiased scoring - the evaluator should not be the same agent that made the improvements.

### Step 3: Update this report

After evaluation, update this quality report:

1. Update the relevant category table with new scores and notes
2. Recalculate and update Summary statistics averages for affected categories
3. Move articles between "Highest rated" and "Needs improvement" sections as appropriate
4. Update Key findings if the changes affect overall patterns
5. Update the "Generated" date at the top of this file

### Batch vs sequential

- **Sequential (recommended):** Improve → Evaluate → Update report → Next article. Better for tracking progress and catching issues early.
- **Batch:** Improve multiple articles → Evaluate all → Update report. Faster but harder to track which improvements worked.

## Scoring criteria

- **Readability (0-10)**: How clear and easy to understand is the writing?
- **Structure (0-10)**: Does it follow proper document structure (Overview, sections, Key files, Related)?
- **Conformance (0-10)**: How well does it follow the documentation guide (sentence case headings, frontmatter, active voice, conciseness)?

---

## Summary statistics

| Category        | Avg Readability | Avg Structure | Avg Conformance | Files |
| --------------- | --------------- | ------------- | --------------- | ----- |
| Architecture    | 8.8             | 10.0          | 9.9             | 10    |
| Editor features | 8.7             | 9.5           | 9.3             | 16    |
| Infrastructure  | 8.6             | 10.0          | 9.6             | 5     |
| Overview        | 9.0             | 9.3           | 9.5             | 4     |
| Guides          | 9.0             | 9.2           | 8.8             | 6     |
| Packages        | 8.2             | 6.9           | 7.9             | 14    |
| Reference       | 8.8             | 7.8           | 9.0             | 4     |
| Templates       | 8.3             | 8.3           | 9.0             | 6     |
| Tooling         | 9.0             | 10.0          | 10.0            | 4     |
| Apps            | 8.5             | 9.3           | 9.3             | 4     |
| Changelog       | 8.4             | 9.2           | 8.4             | 26    |

---

## Editor features documentation

| File                                  | Readability | Structure | Conformance | Notes                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ----------- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| editor-features/index.md              | 7           | 5         | 6           | Navigation index with proper frontmatter and sentence case. Missing Overview section (1-2 paragraphs), no Key files section, minimal prose explanations. Structure is mostly categorized bullet lists without explanatory prose about feature groupings or conceptual relationships.                                                         |
| editor-features/animation.md          | 9           | 9         | 9           | Excellent. Strong overview, good tick system example, practical easing guidance.                                                                                                                                                                                                                                                             |
| editor-features/camera-system.md      | 9           | 10        | 10          | Exemplary. Comprehensive coverage of camera mechanics, constraints, and methods.                                                                                                                                                                                                                                                             |
| editor-features/click-detection.md    | 9           | 10        | 10          | Exemplary. Comprehensive state machine explanation, clear event handling, good timing docs.                                                                                                                                                                                                                                                  |
| editor-features/edge-scrolling.md     | 9           | 10        | 10          | Exemplary. Perfect structure with strong Overview establishing function and role. Well-organized subsections in Edge detection and Speed calculation for improved scanability. Concise prose throughout, excellent sentence case, active voice, minimal code examples.                                                                       |
| editor-features/coordinate-systems.md | 9           | 10        | 9           | Exemplary. Clear prose explanations of three coordinate spaces, practical code examples, strong overview. Minor: slightly more code examples than typical (6 total) but each serves distinct purpose.                                                                                                                                        |
| editor-features/snapping.md           | 9           | 10        | 9           | Exemplary. Strong Overview establishing function and role with clear taxonomy of snapping types. Consistent active voice, proper sentence case throughout, minimal focused code examples. Logical section flow from SnapManager through bounds/handle snapping to indicators.                                                                |
| editor-features/selection-system.md   | 9           | 10        | 10          | Exemplary. Perfect structure, clear technical writing, minimal code examples. Defines "focused group" on first use, consistent active voice throughout. Strong Overview establishing function and role.                                                                                                                                      |
| editor-features/shape-indexing.md     | 9           | 10        | 9           | Exemplary. Strong Overview establishing function before mechanism. Perfect sentence case, active voice throughout, logical flow from concept to implementation to collaboration. Minimal focused code examples. Clear explanation of fractional indexing benefits.                                                                           |
| editor-features/tick-system.md        | 9           | 10        | 9.5         | Exemplary. Exceptional structure and clarity with progressive explanation. Code examples properly annotated with "Simplified for clarity" notes and all variables defined. Strong balance of prose and code.                                                                                                                                 |
| editor-features/focus-management.md   | 9           | 9.5       | 9.5         | Exemplary. Strong 2-paragraph Overview establishing function and role. Well-organized "How it works" section with logical subsections covering focus state, container synchronization, auto-focus, pointer interactions, shape editing, and focus restoration. Proper sentence case throughout, active voice, minimal focused code examples. |
| editor-features/history-system.md     | 9           | 9         | 8.5         | Strong. Good Overview establishing function and role. Well-organized sections covering how it works, marks, basic operations, and advanced features. Active voice throughout, proper sentence case. Good balance of prose and code. Minor: "Integration with the store" section may be too implementation-focused.                           |
| editor-features/input-handling.md     | 9           | 10        | 10          | Exemplary. Strong Overview establishing function and role, perfect structure with all required sections. Excellent balance of prose and code examples. Active voice throughout, proper sentence case. Well-organized progression from concepts to implementation details.                                                                    |
| editor-features/user-following.md     | 8           | 9         | 9           | Excellent. Strong Overview establishing function and role, proper structure with How it works, API methods, Follow chains, and UI integration sections. Good balance of prose and code examples. All headings use sentence case, active voice throughout. Minor: some sentences dense with multiple clauses.                                 |
| editor-features/text-measurement.md   | 9           | 9         | 9           | Exemplary. Strong Overview establishing function and role. Excellent balance of prose and code with properly annotated examples. All headings use sentence case, active voice throughout. Comprehensive coverage of TextManager and FontManager.                                                                                             |
| editor-features/scribble.md           | 9           | 10        | 10          | Exemplary. Perfect structure with strong Overview establishing function and role. Well-organized sections covering lifecycle, usage, properties, and use cases. All headings use sentence case, active voice throughout. Minimal focused code examples. Complete Key files and Related sections.                                             |

**Summary**: Most editor features documentation is exemplary (16 files). Individual feature articles score consistently high with strong overviews and proper structure. The index.md serves as a navigation page but needs a formal Overview section, Key files section, and more prose explanations for each category.

---

## Architecture documentation

| File                           | Readability | Structure | Conformance | Notes                                                                                            |
| ------------------------------ | ----------- | --------- | ----------- | ------------------------------------------------------------------------------------------------ |
| architecture/reactive-state.md | 9           | 10        | 10          | Excellent. Clear prose, proper sentence case, perfect structure with all required sections.      |
| architecture/asset-pipeline.md | 9           | 10        | 10          | Very strong. Clear explanation, proper structure, appropriately sized code examples.             |
| architecture/binding-system.md | 9           | 10        | 10          | Excellent clarity and structure. Good balance of prose and code.                                 |
| architecture/migrations.md     | 9           | 10        | 10          | Comprehensive and well-written. Strong coverage of migration mechanics.                          |
| architecture/multiplayer.md    | 9           | 10        | 10          | Clear and well-organized. Excellent ASCII diagram for architecture visualization.                |
| architecture/shape-system.md   | 9           | 10        | 10          | Excellent explanation of three-part architecture. Good minimal code examples.                    |
| architecture/style-system.md   | 8           | 10        | 10          | Clear and concise. Appropriate brevity for the topic scope.                                      |
| architecture/tool-system.md    | 8           | 10        | 10          | Solid StateNode explanation. Code example demonstrates tool creation well.                       |
| architecture/ui-components.md  | 9           | 10        | 9           | Excellent expanded overview, rich prose explanations, good ASCII diagram, minimal code examples. |
| architecture/store-records.md  | 9           | 10        | 10          | Comprehensive coverage of Store, records, schema. Good use of tables.                            |

**Summary**: Architecture documentation is exemplary. All files follow the guide perfectly with consistent sentence case, proper frontmatter, and excellent structure.

---

## Infrastructure documentation

| File                                  | Readability | Structure | Conformance | Notes                                                                                   |
| ------------------------------------- | ----------- | --------- | ----------- | --------------------------------------------------------------------------------------- |
| infrastructure/asset-upload-worker.md | 9           | 10        | 9           | Excellent structure. "Operational notes" could have more descriptive heading.           |
| infrastructure/image-resize-worker.md | 9           | 10        | 10          | Very well-written. Concise without sacrificing clarity. Model documentation.            |
| infrastructure/sync-worker.md         | 8           | 10        | 9           | Strong structure. Development workflow could add brief context about scripts.           |
| infrastructure/fairy-worker.md        | 9           | 10        | 10          | Excellent conformance. Clear overview, good SSE streaming code example.                 |
| infrastructure/zero-cache.md          | 8           | 10        | 9           | Good architecture explanation. Could define specialized terms (CRDT, CVR) on first use. |

**Summary**: Infrastructure docs are strong. All follow the guide well with minor improvements possible around term definitions and section naming.

---

## Overview documentation

| File                              | Readability | Structure | Conformance | Notes                                                                                          |
| --------------------------------- | ----------- | --------- | ----------- | ---------------------------------------------------------------------------------------------- |
| overview/architecture-overview.md | 9           | 10        | 10          | Excellent clarity. Perfect structure with all required sections.                               |
| overview/getting-started.md       | 10          | 10        | 10          | Exceptionally clear. Perfect for onboarding. Great troubleshooting section.                    |
| overview/repository-overview.md   | 9           | 10        | 10          | Clear and concise. Effective ASCII tree diagram. Good table usage.                             |
| index.md                          | 8           | 7         | 8           | Good navigation page. Structure differs (table of contents format). Some descriptions verbose. |

**Summary**: Overview docs are excellent, especially getting-started.md which is a model document. The index.md appropriately serves as a navigation hub.

---

## Guides documentation

| File                       | Readability | Structure | Conformance | Notes                                                                          |
| -------------------------- | ----------- | --------- | ----------- | ------------------------------------------------------------------------------ |
| guides/custom-shapes.md    | 9           | 10        | 9           | Excellent clarity. Perfect guide structure. Code examples minimal and focused. |
| guides/custom-bindings.md  | 9           | 10        | 9           | Well structured. Tips section adds practical value.                            |
| guides/custom-tools.md     | 9           | 10        | 9           | Clean and focused. Good balance of brevity and clarity.                        |
| guides/ui-customization.md | 9           | 9         | 9           | Well-organized. Could benefit from code example showing hook usage.            |
| guides/writing-examples.md | 9           | 10        | 9           | Strong structure. Good README frontmatter and component structure examples.    |
| guides/testing.md          | 9           | 8         | 8           | Good clarity. Structure deviates from guide template (no Prerequisites/Steps). |

**Summary**: Guides are high quality with strong readability. Testing guide uses different structure but content is effective.

---

## Packages documentation

| File                      | Readability | Structure | Conformance | Notes                                                                                  |
| ------------------------- | ----------- | --------- | ----------- | -------------------------------------------------------------------------------------- |
| packages/assets.md        | 7           | 4         | 6           | Missing Architecture, Key concepts is bullets only, no API patterns.                   |
| packages/create-tldraw.md | 8           | 3         | 6           | Missing Architecture, Key concepts, API patterns sections entirely.                    |
| packages/dotcom-shared.md | 7           | 4         | 6           | Missing Architecture and API patterns, Key concepts is bullets only.                   |
| packages/editor.md        | 8           | 5         | 7           | Key concepts is bullets, missing Architecture section.                                 |
| packages/state.md         | 8           | 5         | 7           | Key concepts is bullets, missing Architecture section.                                 |
| packages/state-react.md   | 5           | 3         | 6           | Minimal stub, missing most required sections.                                          |
| packages/store.md         | 9           | 10        | 10          | Excellent. All sections present with prose explanations, strong architecture coverage. |
| packages/sync-core.md     | 9           | 10        | 9           | Excellent. All sections present with prose explanations.                               |
| packages/sync.md          | 9           | 10        | 9           | Excellent. Comprehensive architecture and practical patterns.                          |
| packages/tldraw.md        | 9           | 9         | 9           | Very comprehensive flagship docs with strong customization coverage.                   |
| packages/tlschema.md      | 9           | 9         | 9           | Excellent structure and prose explanations throughout.                                 |
| packages/utils.md         | 8           | 7         | 8           | Good but Key concepts section is too code-heavy, needs more prose.                     |
| packages/validate.md      | 9           | 8         | 9           | Strong but some sections lean too heavily on code examples.                            |
| packages/worker-shared.md | 9           | 9         | 9           | Model document with excellent balance of prose and examples.                           |

**Summary**: Package docs vary significantly. Improved packages (sync-core, sync, tldraw, tlschema, validate, worker-shared) score well. Original packages (store, state-react, assets, create-tldraw, dotcom-shared, editor, state) need significant work - missing Architecture sections and Key concepts with prose.

---

## Reference documentation

| File                         | Readability | Structure | Conformance | Notes                                                                                  |
| ---------------------------- | ----------- | --------- | ----------- | -------------------------------------------------------------------------------------- |
| reference/api-conventions.md | 8           | 7         | 9           | Concise and clear. Could use more context on when/why patterns matter.                 |
| reference/glossary.md        | 9           | 8         | 9           | Excellent conciseness. Proper fragment formatting. Overview could be more descriptive. |
| reference/commands.md        | 9           | 6         | 8           | Extremely clear for reference. Too minimal - sections need explanatory prose.          |
| reference/validation.md      | 9           | 10        | 10          | Excellent model reference document. Strong overview, logical sections, good Gotchas.   |

**Summary**: Reference docs are generally strong. validation.md is exemplary. commands.md needs more explanatory prose (code without context).

---

## Templates documentation

| File                         | Readability | Structure | Conformance | Notes                                                             |
| ---------------------------- | ----------- | --------- | ----------- | ----------------------------------------------------------------- |
| templates/vite.md            | 9           | 9         | 9           | Excellent clarity. Could add why it's "fastest" in Overview.      |
| templates/nextjs.md          | 9           | 9         | 9           | Very clear. Good App Router / client component explanation.       |
| templates/sync-cloudflare.md | 8           | 8         | 9           | Clear technical content. Could explain Durable Objects briefly.   |
| templates/agent.md           | 8           | 8         | 9           | Well-written. Could clarify which AI service is used.             |
| templates/workflow.md        | 8           | 8         | 9           | Clear node-based editor explanation. Could add use case examples. |
| templates/branching-chat.md  | 8           | 8         | 9           | Good conversation tree UI explanation. Practical API key note.    |

**Summary**: Template docs are consistently good. Appropriately brief for their purpose. Minor improvements possible in Overview sections.

---

## Tooling documentation

| File                       | Readability | Structure | Conformance | Notes                                                                                      |
| -------------------------- | ----------- | --------- | ----------- | ------------------------------------------------------------------------------------------ |
| tooling/code-quality.md    | 9           | 10        | 10          | Excellent. Strong overview, descriptive subsections, proper balance of prose and code.     |
| tooling/lazyrepo.md        | 9           | 10        | 10          | Excellent. Clear "Why LazyRepo" section, comprehensive caching explanation, good examples. |
| tooling/yarn-workspaces.md | 9           | 10        | 10          | Excellent. Strong workspace concept explanation, proper subsections, good troubleshooting. |
| tooling/typescript.md      | 9           | 10        | 10          | Exemplary. Clear prose explaining project references and configuration rationale.          |

**Summary**: All tooling documentation is now exemplary. Each file has strong overviews, descriptive subsections, proper structure, and excellent balance of explanation and examples.

---

## Apps documentation

| File                  | Readability | Structure | Conformance | Notes                                                                             |
| --------------------- | ----------- | --------- | ----------- | --------------------------------------------------------------------------------- |
| apps/docs.md          | 8           | 9         | 9           | Strong overall. Good code examples. Note: updated_at shows future date (typo).    |
| apps/dotcom-client.md | 8           | 9         | 9           | Well-structured. Routes section adds helpful context. Future date in frontmatter. |
| apps/examples.md      | 9           | 10        | 10          | Excellent guide adherence. Strong overview, practical "Adding examples" section.  |
| apps/vscode.md        | 9           | 9         | 9           | Concise and well-structured. Good messaging pattern code example.                 |

**Summary**: Apps docs demonstrate high quality. examples.md is exemplary. All have future date typo in updated_at field.

---

## Changelog documentation

| File               | Readability | Structure | Conformance | Notes                                                                                     |
| ------------------ | ----------- | --------- | ----------- | ----------------------------------------------------------------------------------------- |
| changelog/index.md | 9           | 10        | 10          | Excellent navigation document. Clear descriptions for each version.                       |
| changelog/next.md  | 9           | 10        | 10          | Comprehensive. Proper sections, PR links, contributor credits. Future date typo.          |
| changelog/v4.2.md  | 9           | 10        | 10          | Strong. Clear featured section, proper formatting, good patch releases.                   |
| changelog/v4.1.md  | 9           | 10        | 10          | Excellent shader starter kit documentation. Proper structure.                             |
| changelog/v4.0.md  | 8           | 9         | 9           | Comprehensive major release. Some sections lack PR links.                                 |
| changelog/v3.15.md | 8           | 9         | 9           | Good structure. Some items verbose. Missing PR links in several sections.                 |
| changelog/v3.14.md | 8           | 9         | 8           | Good structure. Missing PR links throughout most sections.                                |
| changelog/v3.13.md | 9           | 10        | 9           | Excellent. Bug fixes lack specificity and PR links.                                       |
| changelog/v3.12.md | 9           | 10        | 10          | Strong. Clear accessibility focus. Proper section ordering.                               |
| changelog/v3.11.md | 8           | 10        | 9           | Well-structured. Some items lack PR attribution.                                          |
| changelog/v3.10.md | 8           | 10        | 9           | Good rich text feature section. Some items lack PR links.                                 |
| changelog/v3.9.md  | 8           | 9         | 8           | Clean and concise. Missing PR links throughout.                                           |
| changelog/v3.8.md  | 8           | 10        | 9           | Comprehensive breaking changes. Missing PR links on most items.                           |
| changelog/v3.7.md  | 9           | 10        | 10          | Excellent conformance. Includes PR links for improvements.                                |
| changelog/v3.6.md  | 8           | 7         | 7           | Improved with Featured section, PR links, unbundled fixes.                                |
| changelog/v3.5.md  | 8           | 9         | 8           | Strong structure. Some items lack PR links.                                               |
| changelog/v3.4.md  | 8           | 9         | 7           | Clear organization. Most items missing PR links.                                          |
| changelog/v3.3.md  | 8           | 9         | 7           | Clean structure. Bug fixes too brief. Missing PR links.                                   |
| changelog/v3.2.md  | 10          | 8         | 9           | Appropriately brief version alignment release.                                            |
| changelog/v3.1.md  | 8           | 9         | 8           | Strong feature descriptions. Bug fixes lack PR links.                                     |
| changelog/v3.0.md  | 8           | 7         | 8           | Improved with migration guidance and before/after code examples.                          |
| changelog/v2.4.md  | 9           | 10        | 9           | Excellent. Clear writing, good featured sections with code examples.                      |
| changelog/v2.3.md  | 9           | 9         | 8           | Clear. Uses "Features" instead of standard section names.                                 |
| changelog/v2.2.md  | 9           | 10        | 10          | Exemplary. Excellent featured sections, proper breaking changes, complete patch releases. |
| changelog/v2.1.md  | 9           | 9         | 9           | Strong breaking changes documentation. Good performance section.                          |
| changelog/v2.0.md  | 10          | 8         | 7           | Most readable. Initial release format differs from standard changelog structure.          |

**Summary**: Changelog quality improves over time. Recent versions (v4.x, v3.12+) show better PR link attribution. Older versions commonly miss PR links and have vague bug fix descriptions.

---

## Key findings

### Strengths

1. **Architecture docs are exemplary** - All 10 files score perfect 10s for structure and conformance
2. **Tooling docs now exemplary** - All 4 tooling docs score 29/30 with strong overviews and descriptive subsections
3. **Some package docs excellent** - store, sync-core, sync, tldraw, tlschema, worker-shared score 27+ after improvement
4. **Consistent sentence case** - Almost all files properly use sentence case for headings
5. **Good frontmatter usage** - Most files include proper title, dates, and keywords
6. **Strong infrastructure docs** - Clear explanations of complex systems
7. **Effective overview docs** - getting-started.md is a model document

### Areas for improvement

1. **Package documentation gaps** - 6 package docs (state-react, assets, create-tldraw, dotcom-shared, editor, state) are minimal stubs missing Architecture sections and proper Key concepts with prose
2. **Reference commands.md** - Needs explanatory prose, not just code blocks
3. **Changelog PR links** - Older changelogs (v3.0-v3.9) inconsistently include PR links

### Recommendations

1. Improve package docs: state-react.md, assets.md, create-tldraw.md, dotcom-shared.md, editor.md, state.md
2. Add explanatory prose to reference/commands.md for each command category
3. Consider backfilling PR links in older changelog entries

---

## Files by score

### Highest rated (27+ total score)

| File                                  | Total | R   | S   | C   |
| ------------------------------------- | ----- | --- | --- | --- |
| overview/getting-started.md           | 30    | 10  | 10  | 10  |
| architecture/reactive-state.md        | 29    | 9   | 10  | 10  |
| architecture/asset-pipeline.md        | 29    | 9   | 10  | 10  |
| architecture/binding-system.md        | 29    | 9   | 10  | 10  |
| architecture/migrations.md            | 29    | 9   | 10  | 10  |
| architecture/multiplayer.md           | 29    | 9   | 10  | 10  |
| architecture/shape-system.md          | 29    | 9   | 10  | 10  |
| architecture/store-records.md         | 29    | 9   | 10  | 10  |
| apps/examples.md                      | 29    | 9   | 10  | 10  |
| changelog/v2.2.md                     | 29    | 9   | 10  | 10  |
| reference/validation.md               | 29    | 9   | 10  | 10  |
| tooling/typescript.md                 | 29    | 9   | 10  | 10  |
| tooling/code-quality.md               | 29    | 9   | 10  | 10  |
| tooling/lazyrepo.md                   | 29    | 9   | 10  | 10  |
| tooling/yarn-workspaces.md            | 29    | 9   | 10  | 10  |
| packages/sync-core.md                 | 28    | 9   | 10  | 9   |
| packages/sync.md                      | 28    | 9   | 10  | 9   |
| packages/tldraw.md                    | 27    | 9   | 9   | 9   |
| packages/tlschema.md                  | 27    | 9   | 9   | 9   |
| packages/worker-shared.md             | 27    | 9   | 9   | 9   |
| editor-features/tick-system.md        | 28.5  | 9   | 10  | 9.5 |
| packages/store.md                     | 29    | 9   | 10  | 10  |
| editor-features/camera-system.md      | 29    | 9   | 10  | 10  |
| editor-features/click-detection.md    | 29    | 9   | 10  | 10  |
| editor-features/scribble.md           | 29    | 9   | 10  | 10  |
| editor-features/edge-scrolling.md     | 29    | 9   | 10  | 10  |
| editor-features/coordinate-systems.md | 28    | 9   | 10  | 9   |
| editor-features/selection-system.md   | 29    | 9   | 10  | 10  |
| editor-features/shape-indexing.md     | 28    | 9   | 10  | 9   |
| editor-features/snapping.md           | 28    | 9   | 10  | 9   |
| editor-features/animation.md          | 27    | 9   | 9   | 9   |
| editor-features/input-handling.md     | 29    | 9   | 10  | 10  |
| editor-features/text-measurement.md   | 27    | 9   | 9   | 9   |
| editor-features/focus-management.md   | 28    | 9   | 9.5 | 9.5 |

### Needs improvement (< 24 total score)

| File                      | Total | R   | S   | C   |
| ------------------------- | ----- | --- | --- | --- |
| packages/state-react.md   | 14    | 5   | 3   | 6   |
| packages/assets.md        | 17    | 7   | 4   | 6   |
| packages/create-tldraw.md | 17    | 8   | 3   | 6   |
| packages/dotcom-shared.md | 17    | 7   | 4   | 6   |
| packages/editor.md        | 20    | 8   | 5   | 7   |
| packages/state.md         | 20    | 8   | 5   | 7   |
| changelog/v3.6.md         | 22    | 8   | 7   | 7   |
| changelog/v3.0.md         | 23    | 8   | 7   | 8   |
| index.md                  | 23    | 8   | 7   | 8   |
| reference/commands.md     | 23    | 9   | 6   | 8   |
| packages/utils.md         | 23    | 8   | 7   | 8   |
