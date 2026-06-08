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
   the height; others read it. _Anything derived that feeds shared geometry is stored._
6. **Styling goes through one resolver**, used by both table chrome and cell content, so
   they always agree. v1 hardcoded the header background and ignored the cell's own fill
   (the header-style bug).
7. **The default cell kind is overridable.** Register your renderer _as_ the `text` kind
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
  header look is automatic _and_ fully overridable per cell.

### Layout & measurement (stored, deterministic)

- Column widths: stored, authoritative; **manually resizable** (interior handles).
- Row heights: **auto-height only** — a row fits its tallest cell. The reconciler measures via
  the cell kind's `measure()` on content/create/delete and **writes** the height to the
  record; all clients read it. No manual row resize and no `scaleY` on the table — this removes
  the manual-min-vs-content conflict entirely (columns resize; rows fit content, à la Notion).
  Formula/custom cells measure their _rendered_ output, not raw `richText`.

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
  overrides win against. Pros: a header _means_ something — needed for accessibility
  (`<th>`/scope), export, freeze-header, exclude-from-sort, repeat-on-paginate; the default
  look is free; fully restyleable. Con: a touch of "magic" in the resolver.
- **B — no header concept; a header is just a styled row.** "Make header" = apply a style
  to a row's cells. Pros: zero magic, fully uniform. Con: throws away the _semantic_ — any
  feature that must know "is this a header" (a11y, export, freeze, sort) has nowhere to read
  it. We chose A because we'll want that information and the cascade keeps styling free.

### 2. Row selection — **materialize on selection**

`selectRow(rowId)` / `selectColumn(colId)` **create records for the row/column's empty
cells first, then select them all.** Consequence: selecting a row yields real cells you can
style (header styling "just works"), at the cost of densifying that row. This is the
intended trade against pure sparsity — you only pay it when you act on a whole row/column.

### 3. Reference-rewriting hook — expanded

The problem: a formula `=B5` is _positional_ — "column X, the row at index 4." Delete row 2
and `=B5` should become `=B4`, but **core can't do this rewrite because core doesn't own
formulas** (they're consumer code on the seam). Two ways to give the consumer what they need:

- **(a) Store refs by id (robust).** The consumer's formula layer stores references as
  `{ colId, rowId }` and only _renders/parses_ A1. Stable ids mean structural edits need no
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

### 4. Frame-like drill gap — **investigated, then rejected (keep the `onClick` drill)**

Original plan: generalize `getOutermostSelectableShape` + `focusedGroup` to any "container,"
so the editor natively does table → cell → text. Investigating the editor's selection code to
implement it changed the conclusion:

- **The table's drill is already on the supported seam.** `PointingShape` (the select tool's
  click state) checks `util.onClick` and, when present, defers to pointer-up and calls it
  _instead of_ default selection (PointingShape.ts:33, 84–93). The table's single-click drill
  (`drillSelectCell`) uses exactly this hook — it is the editor's intended extension point, not
  glue fighting it. The design doc's framing of this as "hand-rolled glue" was wrong.
- **`focusedGroup` is hardcoded to groups** in ~10 places (`isShapeOfType(s, 'group')` in
  `getOutermostSelectableShape`, ×8 in `Idle.ts`, and a selection side-effect that auto-focuses
  the common _group_ ancestor) plus the `focusedGroupId` page-state field. Generalizing it is a
  large change with a schema migration and a regression surface across all group/frame
  selection.
- **And it's the wrong interaction model.** `focusedGroup` implements _double-click-to-enter_;
  the table deliberately uses _single-click drill_ (click → table, click → cell, click → text).
  Forcing the table onto the group model would change its UX to the wrong behaviour.

**Decision: keep the `onClick`-based single-click drill** (verified working across every
example). The only genuinely hand-rolled bit is the arrow-key cell navigation (a capture-phase
DOM keydown listener); moving that into a proper select-tool state is a small, separate,
optional refinement — not the editor-core refactor originally imagined. There is therefore **no
required `@tldraw/editor` change**; the whole shape lives in `@tldraw/tldraw` + `tlschema`.

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
6. **Container selection (editor)** — INVESTIGATED & REJECTED (decision 4): the drill already
   uses the supported `onClick` hook; generalizing `focusedGroup` is high-risk _and_ the wrong
   interaction model. No editor change. (Optional: move arrow-nav into a select-tool state.)
7. **Selection helpers** — `selectRow`/`selectColumn` with materialization (decision 2).
8. **Structural-change event** (decision 3).
9. **Examples** — port the minimal set; keep the formula/vlookup engines as examples.
10. **api-check / migration tests / e2e smoke.**

## Known limits / open

- **tsgo discriminated-union false-positives (root cause confirmed; NOT a table-code defect).**
  Adding `table` + `table-cell` can make `tsgo` (the repo's alpha typechecker,
  `@typescript/native-preview` `7.0.0-dev`) report ~10 `TLShapePartial` assignment errors in
  _unrelated_ `createShape` sites (frames, excalidraw, resizing, …). A focused investigation
  (background research agent) established:
  - **It is not the table code.** Erasing _every_ table-side type construct to `any` (call
    sites, `TLShapePartial<TLTableShape>` return annotations, `ShapeUtil<TLTableCell…>` generics)
    still produced the 10. Conversely, with the table layer fully intact, _excluding the
    `src/test/_`fixture files* (each`declare module … TLGlobalShapePropsMap`adds ~15 fixture
shapes to`TLShape`) dropped it to **0**.
  - **Root cause = the >25-member discriminated-union assignability limit**
    ([TS#42518](https://github.com/microsoft/TypeScript/issues/42518)): the `TLShape` union
    (defaults + ~15 test fixtures + `table` + `table-cell`) crosses ~25–30 members, so a source
    `{ type: <30-member union> }` fails to assign to the distributed `TLShapePartial`. The
    table's two shapes are the straw, not the cause.
  - **It is nondeterministic** ([typescript-go#2951](https://github.com/microsoft/typescript-go/discussions/2951)):
    the _same byte-identical tree_ reports 10 (cold `.tsbuild` cache) or **0** (warm) — directly
    reproduced. The earlier consistent "10" was cold-cache (each edit invalidates the package's
    tsbuildinfo); a warm cache currently shows 0.
  - **Caveats:** real `tsc` could not be run in the sandbox, so "stock `tsc` passes" is
    structurally-likely but unverified; a forced cold rebuild (`--force`) was also blocked.
  - **Disposition:** treat as a known tsgo-alpha false-positive — same category as the existing
    `nudge.test.ts` filter — and don't contort the table for it. CI on a cold checkout may see the
    errors; if a green typecheck is required before tsgo fixes land, apply a narrow, commented
    cast at the ~8 failing sites (they build `{ id, type: shape.type, … }` and assign to
    `TLShapePartial`) — a workaround for a compiler bug in non-table files, not a table change.
- **Scale:** sparse storage = empty cells are free; a fully dense 200×200 (≈40k records)
  is the ceiling. v1 stance: sparse-only, document it; dense mode is future, not v1.
- Header default styling values (fill variant, weight) — pick concrete values in step 1.
- Whether the table shape itself carries StyleProps (for "set whole-table default" via the
  panel) or only `defaultStyle` plain props — decide in step 1.
