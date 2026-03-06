---
title: Canvas cleanup
component: ./CanvasCleanupExample.tsx
category: editor-api
priority: 5
keywords:
  [
    cleanup,
    layout,
    word wrap,
    overlap,
    arrow,
    routing,
    bend,
    programmatic,
    resolveTextWordWrap,
    resolveShapeOverlaps,
    rerouteArrows,
    cleanupCanvas,
    mermaid,
    diagram,
  ]
---

Clean up a programmatically generated canvas by fixing word wrap, resolving shape overlaps, and rerouting arrows around bystander shapes.

---

When generating canvases programmatically (for example, from a mermaid diagram or database schema),
shapes often end up with insufficient width to display their labels without breaking words mid-character,
shapes may overlap each other, and arrows may cut straight through shapes they aren't connected to.

The four cleanup utilities handle these problems:

- `resolveTextWordWrap` — expands geo and fixed-width text shapes so no single word is split across
  multiple lines. For arrows with labels, it moves the connected shapes apart until the arrow body
  is long enough to display the label.

- `resolveShapeOverlaps` — iteratively pushes overlapping shapes apart until every pair has at least
  `padding` pixels of space between them (default 20px). Arrow shapes are excluded because they reroute
  automatically as their bound shapes move.

- `rerouteArrows` — adjusts the `bend` of straight and arc arrows so their paths avoid non-endpoint
  shapes. For each arrow that passes through a bystander shape, it tries a range of curvature values
  and picks the one with the least total penetration into obstacles. Elbow arrows are skipped because
  they already route automatically.

- `cleanupCanvas` — runs all three utilities in order as a single undoable step. Word wrap is resolved
  first (so the overlap pass uses final shape sizes), then overlaps (so arrow routing evaluates final
  positions), then arrow rerouting.

The canvas is set up with five distinct groups to show each utility's scope:

- **Text overflow only** (blue) — shapes are well-spaced, but too narrow for their label words.
  Only `resolveTextWordWrap` acts on these.
- **Overlap only** (green) — short labels that fit fine, but shapes are piled on top of each other.
  Only `resolveShapeOverlaps` acts on these.
- **Both issues** (red) — overlapping shapes with labels that also overflow.
  Both word wrap and overlap passes act on these.
- **No issues** (purple) — label fits, no overlap, not in any arrow path. No pass changes this shape.
- **Arrow path only** (orange) — label fits and no overlap with other shapes, but the arrow from
  the blue group to the red group passes straight through it. Only `rerouteArrows` acts on this shape.

Click **Reset messy canvas** to return to the problem state, then try each button individually
to see which shapes it affects, or use **Clean up all** to apply all fixes at once.
**Undo** reverts all cleanup changes in one step.
