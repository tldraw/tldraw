---
title: Merged table cells
component: ./TableMergeExample.tsx
priority: 7
keywords: [table, merge, cell, span, rowspan, colspan, spreadsheet]
---

Merge a block of table cells into one, and unmerge it again.

---

A cell can span multiple rows and columns (`rowSpan`/`colSpan`). The anchor cell
holds the content and covers the positions to its right and below; those covered
positions hold no record and render no border, so the merged cell reads as one.

Drill into a cell, then shift-click another to select a rectangular block — a
floating **Merge cells** button appears above the selection. Select a merged cell
to get an **Unmerge** button. `mergeCells` and `unmergeCell` are public ops; here
they're wired to an `InFrontOfTheCanvas` control so the action is discoverable (a
real app might use a context menu or toolbar button instead). The seeded table
starts with its "Notes" row pre-merged into a single wide cell.

Merged cells don't drive row auto-height (a cell spanning columns can't be
measured against a single column), and structural edits through a merge may need
the span adjusted — both are deliberate v1 limits.
