---
title: Table cell references
component: ./TableReferencesExample.tsx
priority: 6
keywords: [table, reference, formula, spreadsheet, structural, rewrite, insert, delete]
---

Positional cell references that follow their target when rows or columns move.

---

A reference like `=B2` means "column B, row 2" — an index, not an identity. So
inserting or deleting a row or column should shift every reference that points
past the change, or it silently points at the wrong cell.

The SDK ships `diffTableStructure(prev, next)`, which returns the per-axis index
maps for a structural edit (`map[oldIndex]` is the new index, or `null` if the
item was removed). It does not rewrite references itself — your reference syntax
is yours to own — but the diff makes the rewrite a few lines.

This example registers an `afterChange` side effect that calls
`diffTableStructure` and rewrites every `=A1` reference in the table through the
maps. A reference whose target row or column was deleted becomes `=#REF!`.
Column C mirrors column B; insert or delete a row and watch the references follow
their targets. The same diff also enables the robust alternative — storing
references by stable row/column id and only rendering A1 — which needs no rewrite
at all.
