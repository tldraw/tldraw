# Table shape — clean design (v2)

The authoritative design for reimplementing the table as a **default shape in core**
(`@tldraw/tldraw` + `@tldraw/tlschema`), informed by a full v1 build.

- **v1 reference implementation:** branch `tim/table-shape`, commit `7e077cff5`
  (9 shape files + 10 examples + e2e + `TABLE_SHAPE_RFC.md`). Diff it for code; this
  doc is the design, not a code dump.
- **This branch (`tim/table-shape-v2`):** clean reimplementation from main.

## Guiding principle: lean core + seams

Core ships the **interactive grid and the extension seams** — and no domain logic.

- **In core:** records, schema, geometry, rendering, editing, styling, structural ops,
  the cell-kind registry, read projections, reconciliation, container selection.
- **Not in core (consumer code on the seams):** formula engine, CSV/serialization
  format, VLOOKUP/COUNTIFS, sort/filter, conditional formatting, data binding. v1
  proved this line holds — the entire formula engine lived in an example, never the SDK.

## Lessons from v1 → rules (each rule kills a real bug we hit)

1. **Cells are sparse `table-cell` records.** The load-bearing decision. Gave us
   conflict-free multiplayer, bindable/hittable/editable cells, reactive cross-table
   formulas "for free." Keep it.
2. **Frame-like container needs `Group2d` geometry**, not `Rectangle2d` — `getShapeAtPoint`
   iterates children; a flat rect crashed hover.
3. **Render the grid as SVG**, not a `border-collapse <table>` — collapsed borders left
   paint residue during rapid resize.
4. **Cells self-render their content** in their own positioned shapes — rendering cell
   content from the table broke hit-testing and editing.
5. **Row height is stored and kind-measured, never re-derived per client.** v1 measured
   raw `richText`, which (a) made formula/custom cells render giant rows and (b) was a
   latent multiplayer divergence (different fonts/DPR → different layouts → broken
   convergence). Fix: the cell kind reports its rendered size; the mutating client writes
   the height; others read it. *Anything derived that feeds shared geometry is stored.*
6. **Styling goes through one resolver**, used by both table chrome and cell content, so
   they always agree. v1 hardcoded the header background and ignored the cell's own fill
   (the header-style bug).
7. **The default cell kind is overridable.** Register your renderer *as* the `text` kind
   and every cell evaluates formulas / renders custom content — "a formula in any cell."
8. **GC respects kind + value + bindings + editing.** A checkbox cell with `value:false`
   and no text is not empty; a bound cell is never collected.
9. **A focused text editor owns the keyboard.** Cell arrow-nav must bail when any
   contenteditable/input is focused (the arrow-vs-caret fight).
10. **References anchor to `rowId`/`colId`, never positions.** Positional A1 refs broke to
    `#REF!` on row delete.

## Data model (tlschema, default)

```
table.props:
  cols: { id, width }[]                 // ordered; stored width
  rows: { id, height? }[]               // ordered; stored height (null = auto-grow)
  defaultStyle: { color, fill, font, size, align, verticalAlign }   // for new/empty cells
  headerRows: number                    // semantic; feeds the style resolver (0 = none)
  headerCols: number
  borders: 'all' | 'none'

table-cell.props:
  rowId, colId                          // stable ids = the address
  kind: string                          // registry key (default 'text')
  richText                              // editable text source of truth
  color, fill, font, size, align, verticalAlign   // per-cell StyleProps
table-cell.meta:
  <kind-specific data>                  // checkbox bool, rating number, etc.
```

Changes from v1:
- **font and size are per-cell StyleProps** (v1 had them table-wide), so a header row can
  have a different font/size. `defaultStyle` is the inheritance source for new/empty cells.
- **No `value: unknown` prop.** v1 stored custom-kind data in `props.value`, but an
  `unknown`-typed prop poisons tsgo's `TLShapePartial` discriminated union (measured: +10
  type errors across unrelated `createShape`/`updateShape` call sites — the reason v1's
  `api-check` was "blocked by tsgo errors"). v2 stores kind-specific data in the cell's
  **`meta`** (a uniform `JsonObject` across all shapes, so it can't affect the union).
  Verified: schema adds **0** type errors. Cell kinds read `cell.meta`; `isEmpty(cell)`
  checks it.

## Systems

### Style resolver (kills the header bug)

`resolveCellStyle(table, rowIndex, colIndex, cell?) → CellStyle`, pure, in `core/`:
- populated cell → the cell's own style;
- empty cell → `table.defaultStyle`, with a built-in **header default** layered in when
  `rowIndex < headerRows || colIndex < headerCols`.
Both the table chrome (empty-cell backgrounds) and the cell component read this, so the
header look is automatic *and* fully overridable per cell.

### Layout & measurement (stored, deterministic)

- Column widths: stored, authoritative.
- Row heights: stored; recomputed by the reconciler via the cell kind's `measure()` on
  content change and **written to the record**; all clients read it. Formula/custom cells
  measure their *rendered* output, not raw `richText`.

### Geometry & rendering

- Table `getGeometry` → `Group2d` of per-cell `Rectangle2d`s (frame-like hit-testing).
- Table `component` → `SVGContainer`: backgrounds via `resolveCellStyle` + grid lines.
- Cell `component` → `HTMLContainer` → the kind's `Component`.

### Reconciliation (promote to an SDK pattern)

Registered side effects keep derived state consistent:
- skeleton change → reposition cells to grid rects (write only when changed → convergent);
- content change → recompute + store affected row heights via `kind.measure()`;
- orphan GC → delete cells whose row/col is gone, unless bound;
- empty GC → collectable iff `kind.isEmpty(cell)` and not bound and not editing.

### Cell kinds (the one seam)

```
TableCellKind {
  type
  Component(props)        // render
  measure?(cell, width)   // row-height participation
  getText?(cell)          // projection / CSV
  isEmpty?(cell)          // GC
}
```
Registered via `configure({ kinds })`; default `text` kind is replaceable.

### Structural ops + reference hook (see decision 3)

`insertRow/Column`, `deleteRow/Column`, `setColumnWidth`, `setRowHeight`. They emit a typed
**structural-change event** carrying the id↔index mapping, so a consumer's formula layer
can rewrite references. Core owns the hook; the rewriting is consumer code.

## Resolved decisions

### 1. Header model — chosen: **A (semantic counts + cascade)**

- **A — semantic `headerRows`/`headerCols` + style resolver (CHOSEN).** Header-ness is a
  first-class fact: the resolver applies a default header style that per-row/per-cell
  overrides win against. Pros: a header *means* something — needed for accessibility
  (`<th>`/scope), export, freeze-header, exclude-from-sort, repeat-on-paginate; the default
  look is free; fully restyleable. Con: a touch of "magic" in the resolver.
- **B — no header concept; a header is just a styled row.** "Make header" = apply a style
  to a row's cells. Pros: zero magic, fully uniform. Con: throws away the *semantic* — any
  feature that must know "is this a header" (a11y, export, freeze, sort) has nowhere to read
  it. We chose A because we'll want that information and the cascade keeps styling free.

### 2. Row selection — **materialize on selection**

`selectRow(rowId)` / `selectColumn(colId)` **create records for the row/column's empty
cells first, then select them all.** Consequence: selecting a row yields real cells you can
style (header styling "just works"), at the cost of densifying that row. This is the
intended trade against pure sparsity — you only pay it when you act on a whole row/column.

### 3. Reference-rewriting hook — expanded

The problem: a formula `=B5` is *positional* — "column X, the row at index 4." Delete row 2
and `=B5` should become `=B4`, but **core can't do this rewrite because core doesn't own
formulas** (they're consumer code on the seam). Two ways to give the consumer what they need:

- **(a) Store refs by id (robust).** The consumer's formula layer stores references as
  `{ colId, rowId }` and only *renders/parses* A1. Stable ids mean structural edits need no
  rewrite at all — A1 display just recomputes from the new index. Core already exposes the
  ordered `rows`/`cols` with stable ids, so this is fully enabled today.
- **(b) Rewrite A1 text on change (pragmatic).** If the consumer stores `=B5` as text, they
  must shift it on structural edits. Core helps by **emitting a typed structural-change
  event** on insert/delete — `{ tableId, axis: 'row'|'col', op: 'insert'|'delete', index,
  count, idMap }` — so the consumer maps refs through `idMap` and updates affected cells.
  (Without the event they can hand-diff the reactive `rows`/`cols` arrays via a side effect;
  the event just makes it a few lines.)

Core ships the **event** (cheap, formula-agnostic) and the stable ids that make (a)
possible. It does **not** ship reference rewriting. Decision: implement the event.

### 4. Frame-like drill gap — **close it in the editor**

Today `getOutermostSelectableShape` drills only for `group`, so frame-like containers
reimplement click-to-drill, arrow-nav, and keyboard-ownership per-util (v1 did, on both
utils). We will add a **container selection policy** to `@tldraw/editor`: a ShapeUtil
declares it is a drillable container (and how its children map), and the editor handles
click-to-drill (table → cell → text), arrow/tab navigation, and "a focused editor owns the
keyboard" centrally. Tables, frames, and future board shapes all benefit. This is the one
editor-core change in the plan; everything else is `@tldraw/tldraw` + `tlschema`.

## Public API (committed surface)

Schema types; `TableShapeUtil`, `TableCellShapeUtil`, `TableShapeTool`; projections
(`getTableData`, `getCellText`, `getMeasuredTableLayout`, `getTableCells`, `getCellKey`,
`resolveCellStyle`); operations (`insert/deleteRow/Column`, `setColumnWidth`, `setRowHeight`,
`setCellText`, `selectRow`, `selectColumn`); cell-kind registry types + `textCellKind`; the
structural-change event. **Not exported:** any formula/CSV/domain logic.

## Module layout

```
packages/tlschema/src/shapes/TLTableShape.ts, TLTableCellShape.ts   (default schema)
packages/tldraw/src/lib/shapes/table/
  core/            ← pure, NO editor/render imports (enforce via eslint import rule)
    types.ts  layout.ts  operations.ts  references.ts  serialization.ts  style.ts
  TableShapeUtil.tsx  TableCellShapeUtil.tsx  TableShapeTool.ts
  cellKinds.tsx  reconcile.ts  index.ts
packages/editor/...   ← container selection policy (decision 4)
```

## Phased reimplementation plan

1. **Schema** — clean `TLTableShape`/`TLTableCellShape` (per-cell font/size, defaultStyle,
   headerRows/Cols), register in defaults, migrations from scratch. ← start here
2. **`core/`** — pure layout, style resolver, addressing, operations, serialization +
   unit tests (port v1's deterministic tests).
3. **Shape utils + tool** — geometry (Group2d), SVG render, cell self-render, editing.
4. **Reconciliation** — reposition / stored kind-measured heights / GC.
5. **Cell kinds** — registry + `textCellKind` (with `measure`/`getText`/`isEmpty`).
6. **Container selection (editor)** — close the drill gap (decision 4); wire table/cell.
7. **Selection helpers** — `selectRow`/`selectColumn` with materialization (decision 2).
8. **Structural-change event** (decision 3).
9. **Examples** — port the minimal set; keep the formula/vlookup engines as examples.
10. **api-check / migration tests / e2e smoke.**

## Known limits / open

- **Scale:** sparse storage = empty cells are free; a fully dense 200×200 (≈40k records)
  is the ceiling. v1 stance: sparse-only, document it; dense mode is future, not v1.
- Header default styling values (fill variant, weight) — pick concrete values in step 1.
- Whether the table shape itself carries StyleProps (for "set whole-table default" via the
  panel) or only `defaultStyle` plain props — decide in step 1.
