## 4. Overlays

Overlays that used to be React components passed via `TLEditorComponents`
slots are now `OverlayUtil` classes that draw to a `CanvasRenderingContext2D`.
Pass them via the new `overlayUtils` prop on `<Tldraw>`.

### Slot → OverlayUtil mapping

| Removed `TLEditorComponents` slot | New `OverlayUtil` class |
| --- | --- |
| `Brush` | `BrushOverlayUtil` |
| `ZoomBrush` | `ZoomBrushOverlayUtil` |
| `Scribble` | `ScribbleOverlayUtil` |
| `SnapIndicator` | `SnapIndicatorOverlayUtil` |
| `Handle` / `Handles` | `ShapeHandleOverlayUtil` |
| `SelectionForeground` | `SelectionForegroundOverlayUtil` |
| `CollaboratorHint` | `CollaboratorHintOverlayUtil` |
| `ShapeIndicator` / `ShapeIndicators` | Override `ShapeUtil.getIndicatorPath()` |

`SelectionBackground` is **still a valid** `TLEditorComponents` slot in v5 —
do not migrate it to an OverlayUtil.

### Migration pattern

```tsx
// BEFORE — React component in TLEditorComponents
function MyBrush({ brush }: { brush: TLBrushModel }) {
  const { x, y, w, h } = brush
  return <div className="my-brush" style={{ left: x, top: y, width: w, height: h }} />
}

<Tldraw components={{ Brush: MyBrush }} />

// AFTER — OverlayUtil with canvas rendering
import { Tldraw, BrushOverlayUtil, type TLBrushOverlay } from 'tldraw'

class MyBrushOverlayUtil extends BrushOverlayUtil {
  override render(ctx: CanvasRenderingContext2D, overlays: TLBrushOverlay[]) {
    const overlay = overlays[0]
    if (!overlay) return
    const { x, y, w, h } = overlay.props
    const zoom = this.editor.getEfficientZoomLevel()
    ctx.strokeStyle = 'blue'
    ctx.lineWidth = 1 / zoom
    ctx.strokeRect(x, y, w, h)
  }
}

<Tldraw overlayUtils={[MyBrushOverlayUtil]} />
```

### Key constraints when migrating

- `render()` receives a `CanvasRenderingContext2D`, not a JSX render function.
  No JSX inside `render()`.
- Colors must come from `this.editor.getCurrentTheme().colors[mode]`, not CSS
  variables.
- For overlays that genuinely need React/HTML on top of the canvas, use the
  `InFrontOfTheCanvas` slot in `TLEditorComponents` instead.
- The `static type` on the util class determines which built-in it replaces.

### Shape indicator customization

`ShapeIndicator` / `ShapeIndicators` slots are gone. Customize per shape via
`ShapeUtil.getIndicatorPath()`:

```tsx
import { ShapeUtil, type TLIndicatorPath } from 'tldraw'

class MyShapeUtil extends ShapeUtil<MyShape> {
  override getIndicatorPath(shape: MyShape): TLIndicatorPath | undefined {
    const { w, h } = shape.props
    const path = new Path2D(`M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`)
    return { path }
  }
}
```

The return type is `TLIndicatorPath | undefined`, where `TLIndicatorPath` is
`{ path: Path2D; additionalPaths?: Path2D[]; clipPath?: Path2D }`. Returning
an SVG path string will fail type-checking — wrap your path in a `Path2D`.

### Removed `Default*` exports

`DefaultBrush`, `DefaultScribble`, `DefaultSnapIndicator`, `DefaultHandle`,
`DefaultSelectionForeground`, `DefaultCollaboratorHint`,
`DefaultShapeIndicator`, and `LiveCollaborators` are removed. To extend
behaviour, subclass the corresponding `*OverlayUtil` instead.

Collaborator overlays now ship as separate utils:
`CollaboratorCursorOverlayUtil`, `CollaboratorBrushOverlayUtil`,
`CollaboratorScribbleOverlayUtil`, `CollaboratorHintOverlayUtil`.
