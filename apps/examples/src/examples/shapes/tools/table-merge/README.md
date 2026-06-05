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

Shift-click across a range of cells to select a rectangular block, then press
**m** to merge it (or **u** to unmerge the selected cell). `mergeCells` and
`unmergeCell` are public ops — here they're wired to keys, but you'd hang them off
a toolbar button or context menu in a real app. The seeded table starts with its
"Notes" row pre-merged into a single wide cell.

Merged cells don't drive row auto-height (a cell spanning columns can't be
measured against a single column), and structural edits through a merge may need
the span adjusted — both are deliberate v1 limits.
