---
name: migrate-to-v5
description: Guide non-deterministic migration of tldraw v4.x code to v5.0. Use when the user is upgrading their tldraw integration and needs help with overlay utils, theme migration, asset system changes, or any breaking API from the v5 release.
---

# tldraw v4 → v5 migration

This skill guides the non-deterministic parts of upgrading from tldraw v4.x to v5.0.

## Workflow

1. **Run the migration script first** (handles all deterministic renames):

   ```bash
   node node_modules/tldraw/scripts/migrate-to-v5.js .
   # or, from the tldraw repo:
   node scripts/migrate-to-v5.js .
   ```

   The script auto-fixes prop renames and prints a list of lines needing manual attention.

2. **Run typecheck** to surface type errors from renamed or removed APIs:

   ```bash
   yarn typecheck
   ```

3. **Work through the flagged lines** using the guides below. Start with errors that block compilation, then work through warnings.

---

## Non-deterministic migrations

### 1. `useIsDarkMode` → `useColorMode`

The hook was renamed and its **return type changed** from `boolean` to `'dark' | 'light'`.

- The function name change is safe to apply everywhere.
- **Audit every usage** — truthy checks will break:

  ```tsx
  // Before – boolean, truthy check works
  const isDark = useIsDarkMode()
  if (isDark) { ... }               // ✓ worked before
  return <Icon dark={isDark} />     // ✓ worked before

  // After – string, truthy check is wrong
  const mode = useColorMode()       // 'dark' | 'light'
  if (mode) { ... }                 // ✗ 'light' is also truthy — always true
  return <Icon dark={mode} />       // ✗ type error: string is not boolean
  ```

  Fix pattern:

  ```tsx
  const colorMode = useColorMode()
  const isDark = colorMode === 'dark'   // derive boolean if needed
  if (isDark) { ... }
  return <Icon dark={isDark} />
  ```

### 2. `getDefaultColorTheme` → `editor.getCurrentTheme()`

```tsx
// Before
import { getDefaultColorTheme } from 'tldraw'
const theme = getDefaultColorTheme({ isDarkMode: true })
const fill = theme.blue.semi

// After
const theme = editor.getCurrentTheme()
const colors = theme.colors[editor.getColorMode()] // 'light' | 'dark'
const fill = colors.blue.semi
```

When outside a component (e.g. in a ShapeUtil method), use `this.editor`:

```tsx
override component(shape: MyShape) {
  const theme = this.editor.getCurrentTheme()
  const colors = theme.colors[this.editor.getColorMode()]
  return <rect fill={colors.blue.semi} />
}
```

### 3. Removed constants: `FONT_FAMILIES`, `FONT_SIZES`, `LABEL_FONT_SIZES`, `STROKE_SIZES`, `TEXT_PROPS`, `ARROW_LABEL_FONT_SIZES`

These are now resolved via the display values pipeline. For custom shape utils that read these constants to derive visual properties, override `getDefaultDisplayValues` (or `getCustomDisplayValues` for default shape utils):

```tsx
// Before – reading from a constant
import { FONT_SIZES } from 'tldraw'
override component(shape) {
  const size = FONT_SIZES[shape.props.size]
  ...
}

// After – use the display values passed to component/indicator
// (display values are passed automatically via the shape util pipeline)
// For a custom ShapeUtil, implement getDefaultDisplayValues:
class MyShapeUtil extends ShapeUtil<MyShape> {
  override getDefaultDisplayValues(_editor, shape, theme, colorMode) {
    return {
      fontSize: { s: 12, m: 16, l: 24, xl: 36 }[shape.props.size],
      strokeWidth: { s: 1, m: 2, l: 3, xl: 4 }[shape.props.size],
    }
  }
}
```

### 4. Overlay components → `OverlayUtil`

Overlay React components have been replaced by canvas-rendered `OverlayUtil` classes.

**Mapping:**
| Removed `TLEditorComponents` slot | New `OverlayUtil` class |
|---|---|
| `Brush` | `BrushOverlayUtil` |
| `ZoomBrush` | `ZoomBrushOverlayUtil` |
| `Scribble` | `ScribbleOverlayUtil` |
| `SnapIndicator` | `SnapIndicatorOverlayUtil` |
| `Handle` / `Handles` | `ShapeHandleOverlayUtil` |
| `SelectionForeground` / `SelectionBackground` | `SelectionForegroundOverlayUtil` |
| `CollaboratorHint` | `CollaboratorHintOverlayUtil` |
| `ShapeIndicator` / `ShapeIndicators` | Override `ShapeUtil.getIndicatorPath()` |

**Migration pattern:**

```tsx
// Before
import { Tldraw } from 'tldraw'

function MyBrush({ brush }: { brush: TLBrushModel }) {
	const { x, y, w, h } = brush
	return <div className="my-brush" style={{ left: x, top: y, width: w, height: h }} />
}

;<Tldraw components={{ Brush: MyBrush }} />

// After
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

;<Tldraw overlayUtils={[MyBrushOverlayUtil]} />
```

**Key differences to communicate when migrating:**

- Overlays draw into a `CanvasRenderingContext2D`, not React/DOM
- Colors must come from `this.editor.getCurrentTheme()`, not CSS variables
- For React-based overlays (HTML content on top of the canvas), use the `InFrontOfTheCanvas` slot in `TLEditorComponents` instead
- The `static type` on the util class determines which built-in it replaces

### 5. Shape indicator customization

```tsx
// Before – swap the indicator component
;<Tldraw components={{ ShapeIndicator: MyIndicator }} />

// After – override getIndicatorPath on the ShapeUtil
class MyShapeUtil extends ShapeUtil<MyShape> {
	override getIndicatorPath(shape: MyShape): string | null {
		const { w, h } = shape.props
		return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
	}
}
```

### 6. CSS variables and selectors

Overlay colors no longer come from CSS variables — they come from `TLTheme`. Remove or replace all of the following:

**Removed CSS variables:** `--tl-color-snap`, `--tl-color-brush-fill`, `--tl-color-brush-stroke`, `--tl-color-laser`, `--tl-layer-overlays-custom`

**Removed CSS selectors:** `.tl-brush`, `.tl-scribble`, `.tl-snap-indicator`, `.tl-handle*`, `.tl-selection__fg__outline`, `.tl-corner-handle`, `.tl-text-handle`, `.tl-corner-crop-handle`, `.tl-mobile-rotate__*`

To customize overlay colors, either:

- Register a custom theme via the `themes` prop on `<Tldraw>`
- Override the OverlayUtil and read `this.editor.getCurrentTheme().colors[this.editor.getColorMode()]`

### 7. Asset system (`assetValidator`, `getMediaAssetInfoPartial`, `getAssetInfo`, `notifyIfFileNotAllowed`)

```tsx
// assetValidator removed – pick the specific validator
import { imageAssetValidator, videoAssetValidator, bookmarkAssetValidator } from 'tldraw'

// getMediaAssetInfoPartial removed – implement AssetUtil.getAssetFromFile
class MyAssetUtil extends AssetUtil<TLImageAsset> {
	override async getAssetFromFile(editor, file) {
		// ... return asset metadata
	}
}

// notifyIfFileNotAllowed signature change
// Before: notifyIfFileNotAllowed(file, options)
// After:  notifyIfFileNotAllowed(editor, file, options)

// getAssetInfo signature change
// Before: getAssetInfo(file, options, assetId?)  — throws on failure
// After:  getAssetInfo(editor, file, assetId?)   — returns TLAsset|null
```

### 8. `SvgExportContext.themeId` → `.colorMode`

```tsx
// Before
ctx.themeId // string

// After
ctx.colorMode // 'light' | 'dark'
```

### 9. `PlainTextLabelProps` / `RichTextLabelProps` property renames

```tsx
// Before
const props: PlainTextLabelProps = {
	font: 'draw',
	align: 'middle',
	fill: 'none',
}

// After
const props: PlainTextLabelProps = {
	fontFamily: 'draw',
	textAlign: 'middle',
	// fill removed
}
```

---

## What the migration script does NOT handle

These patterns exist in v4 but have no mechanical equivalent — they require design decisions:

- **Custom overlay components** that render React elements (must move to canvas drawing or `InFrontOfTheCanvas` slot)
- **Custom theme logic** referencing the old `TLDefaultColorTheme` shape (needs audit of the new `TLTheme` palette structure)
- **Dynamic `inferDarkMode`** like `<Tldraw inferDarkMode={userPrefersDark} />` — requires choosing between `'light'`, `'dark'`, and `'system'`
- **Custom shapes** that read from removed constants internally

---

## Verification checklist

After completing migration:

- [ ] `yarn typecheck` passes with no errors
- [ ] Dark/light mode toggle works correctly
- [ ] Custom overlay (if any) renders on canvas
- [ ] Asset upload and drop still work
- [ ] SVG export produces correct output
- [ ] No console errors about removed CSS variables
