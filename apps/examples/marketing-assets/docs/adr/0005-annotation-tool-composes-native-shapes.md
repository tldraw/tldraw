# The annotate tool composes native shapes rather than one custom shape

The [[Annotate tool]] draws an [[Annotation]] as three ordinary tldraw shapes — a geo
ellipse (the oval), a text shape (the note), and an arrow bound from the note to the oval —
created in one drag and grouped so they move and delete as a unit. The note is put straight
into edit mode, so the user types the change the moment the oval is drawn. Nothing about the
[[Re-render]] pipeline changes: the oval, arrow, and note are read by `collectAnnotations`
like any hand-drawn arrow and text, because that is exactly what they are.

We chose composition over a single custom `AnnotationShapeUtil` holding the oval, arrow, and
text together. The headline requirement — text that is **instantly editable** — comes free
and robust from the native text shape and `startEditingShapeWithRichText`; arrow-follows-oval
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

- **One custom annotation shape** (oval + arrow + text in a single record): the cleanest
  single unit, and matches the literal phrasing of the request, but it puts the riskiest
  piece — programmatic rich-text editing inside a custom shape — on the critical path, and
  forces the re-render reader and composite export to special-case a new shape type.
  Rejected for risk and integration cost.
- **A tool with no grouping** (three loose shapes): slightly simpler, but the oval, arrow,
  and note would select and move independently, which reads as three things, not one
  annotation. Rejected for a worse mental model.
