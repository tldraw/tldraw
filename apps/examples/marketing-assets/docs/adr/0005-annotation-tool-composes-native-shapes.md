# The annotate tool composes native shapes rather than one custom shape

The [[Annotate tool]] draws an [[Annotation]] as three ordinary tldraw shapes — a geo
rectangle (ringing the area to change), a text shape (the note), and an arrow bound from the
note to the rectangle — created in one drag and grouped so they move and delete as a unit. The note is put straight
into edit mode, so the user types the change the moment the oval is drawn. Nothing about the
[[Re-render]] pipeline changes: the oval, arrow, and note are read by `collectAnnotations`
like any hand-drawn arrow and text, because that is exactly what they are.

We chose composition over a single custom `AnnotationShapeUtil` holding the rectangle, arrow,
and text together. The headline requirement — text that is **instantly editable** — comes free
and robust from the native text shape and `startEditingShapeWithRichText`; arrow-follows-rectangle
comes free from arrow [[bindings]]; and the annotation slots into the existing re-render
reader with no new shape type to teach it about. A single custom shape would have to
reimplement in-shape rich-text editing (the fragile part), arrow geometry, and SVG export,
and `collectAnnotations` plus the [[Annotated composite]] export would both need to learn the
new type. The accepted trade-off is that an annotation is three records in a group rather
than one record, and that `collectAnnotations` had to become binding-aware: it now reads an
arrow's bindings (`getArrowBindings`) to find the note and the circled target, rather than
inferring them from bounding-box overlap. Overlap alone failed here because a bound arrow
leaves a small gap to its target, so a margin note's box never overlapped its arrow's box
and its text was silently dropped. Overlap is kept as a fallback for hand-drawn arrows.

## Considered options

- **One custom annotation shape** (rectangle + arrow + text in a single record): the cleanest
  single unit, and matches the literal phrasing of the request, but it puts the riskiest
  piece — programmatic rich-text editing inside a custom shape — on the critical path, and
  forces the re-render reader and composite export to special-case a new shape type.
  Rejected for risk and integration cost.
- **A tool with no grouping** (three loose shapes): slightly simpler, but the rectangle, arrow,
  and note would select and move independently, which reads as three things, not one
  annotation. Rejected for a worse mental model.

## Amendment (2026-06-11): the annotation reader is a pure-read seam emitting structured intent

`collectAnnotations` is extracted into a reusable reader. Two changes to the approach above.

**Structured intent, not prose.** The reader returns data, not ready-to-send instruction lines:

```ts
readAnnotations(editor: Editor, frameId: TLShapeId): ReadAnnotation[]

interface ReadAnnotation {
	text: string // the comment
	area: { x: number; y: number; w: number; h: number } // normalized 0..1 to the frame — the subject
	shapeIds: TLShapeId[] // [rectangle, arrow, text]
}
```

The English phrasing the [[Plan]] stage reads ("Change the top left of the asset: …", the
`regionOf` region naming) moves to the caller. The reader stays **pure read** — it takes the
editor, returns data, mutates nothing — so its interface is its test surface. Deleting consumed
annotations, and sweeping the now-empty group shell, moves to a sibling
`deleteAnnotations(editor, anns)`; mutation is not the reader's concern.

We split it this way so the read logic is portable beyond marketing-assets — any "feedback on a
canvas" consumer wants the pairing, not the marketing voice — and unit-testable against a
constructed shape graph without a live [[Re-render]]. The accepted trade-off is one extra
formatting step in the sole current consumer.

**The tool triple is the primary model; hand-drawn is a fallback.** The reader treats an
[[Annotation]] as one exclusive triple — one rectangle (the area the comment applies to), one
arrow, one text note — paired 1:1:1 by walking the arrow's bindings (`start` → note, `end` →
rectangle). The bounding-box overlap path described above is demoted to a secondary fallback for
loose hand-drawn arrows and text, not the main path.
