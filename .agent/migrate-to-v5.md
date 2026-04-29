# tldraw v4 → v5 migration agent

## How to use this file

**Codex:**

```
codex "Migrate this codebase from tldraw v4 to v5" --context .agent/migrate-to-v5.md
```

**Gemini CLI:**

```
gemini -f .agent/migrate-to-v5.md "Migrate this codebase from tldraw v4 to v5"
```

**Any agent:** Load this file as context/system prompt before asking the agent to perform the migration.

---

## Your task

You are migrating a codebase from tldraw v4.x to tldraw v5.0. Work through the steps below in order. After each step, verify your changes compile before continuing.

**Goal:** Every TypeScript error is resolved, the tldraw editor renders correctly, and no v4 APIs remain in use.

---

## Step 1 — Run the migration script

The script at `scripts/migrate-to-v5.js` handles all deterministic renames automatically:

```bash
node scripts/migrate-to-v5.js .
```

If the script is not present, download it from the tldraw repo at `scripts/migrate-to-v5.js` and run it. The script will:

- Auto-fix `inferDarkMode` prop usages
- Print a list of every line that needs manual attention, with a description of the required change

Read the entire output before proceeding.

---

## Step 2 — Run typecheck

```bash
yarn typecheck
# or: npx tsc --noEmit
```

Collect all type errors. Many will correspond directly to the flagged lines from Step 1.

---

## Step 3 — Fix each breaking change

Work through the items below. For each, search the codebase for the pattern and apply the fix.

### 3a. `useIsDarkMode` → `useColorMode`

**Search:** `useIsDarkMode`
**Return type changed:** `boolean` → `'dark' | 'light'`

Rename the function. Then audit every usage site — any code that treats the result as a boolean is now broken:

```tsx
// BROKEN after rename
const isDark = useColorMode()
if (isDark) { ... }              // 'light' is truthy — always true
return <Icon dark={isDark} />    // type error: string ≠ boolean

// FIX
const colorMode = useColorMode()
const isDark = colorMode === 'dark'
if (isDark) { ... }
return <Icon dark={isDark} />
```

### 3b. `getDefaultColorTheme` → `editor.getCurrentTheme()`

**Search:** `getDefaultColorTheme`

```tsx
// BEFORE
const theme = getDefaultColorTheme({ isDarkMode })
const color = theme.blue.semi

// AFTER
const theme = editor.getCurrentTheme()
const color = theme.colors[editor.getColorMode()].blue.semi
```

Inside a `ShapeUtil` method, use `this.editor`. Inside a React component, get the editor via `useEditor()`.

### 3c. `useDefaultColorTheme` removed

**Search:** `useDefaultColorTheme`

```tsx
// BEFORE
const theme = useDefaultColorTheme()

// AFTER
const editor = useEditor()
const colorMode = useColorMode()
const theme = editor.getCurrentTheme()
const colors = theme.colors[colorMode]
```

### 3d. Removed constants

**Search for each and replace as shown:**

| Removed                    | Replacement approach                          |
| -------------------------- | --------------------------------------------- |
| `FONT_FAMILIES`            | Move to `ShapeUtil.getDefaultDisplayValues()` |
| `FONT_SIZES`               | Move to `ShapeUtil.getDefaultDisplayValues()` |
| `LABEL_FONT_SIZES`         | Move to `ShapeUtil.getDefaultDisplayValues()` |
| `STROKE_SIZES`             | Move to `ShapeUtil.getDefaultDisplayValues()` |
| `TEXT_PROPS`               | Move to `ShapeUtil.getDefaultDisplayValues()` |
| `ARROW_LABEL_FONT_SIZES`   | Move to `ShapeUtil.getDefaultDisplayValues()` |
| `DefaultColorThemePalette` | Use `editor.getCurrentTheme().colors`         |
| `defaultColorNames`        | Use `editor.getCurrentTheme()`                |
| `TLDefaultColorTheme`      | Use `TLThemeColors` type                      |
| `DefaultLabelColorStyle`   | Use theme colors directly                     |

**Display values pattern** (for ShapeUtils that read these constants):

```tsx
class MyShapeUtil extends ShapeUtil<MyShape> {
	override getDefaultDisplayValues(_editor, shape, _theme, _colorMode) {
		const sizeMap = { s: 12, m: 16, l: 24, xl: 36 }
		return {
			fontSize: sizeMap[shape.props.size],
			strokeWidth: { s: 1, m: 2, l: 3, xl: 4 }[shape.props.size],
		}
	}
}
```

### 3e. `assetValidator` → specific validators

**Search:** `assetValidator`

Replace with the asset-type-specific validator:

```tsx
// BEFORE
import { assetValidator } from 'tldraw'

// AFTER — choose the appropriate one:
import { imageAssetValidator } from 'tldraw' // for image assets
import { videoAssetValidator } from 'tldraw' // for video assets
import { bookmarkAssetValidator } from 'tldraw' // for bookmark assets
```

### 3f. `getMediaAssetInfoPartial` removed

**Search:** `getMediaAssetInfoPartial`

Move the logic into an `AssetUtil` subclass:

```tsx
// BEFORE
const info = getMediaAssetInfoPartial(file, options)

// AFTER — implement AssetUtil
import { AssetUtil } from '@tldraw/editor'

class MyAssetUtil extends AssetUtil<TLImageAsset> {
	static override type = 'image' as const
	override async getAssetFromFile(editor, file) {
		// put former getMediaAssetInfoPartial logic here
		return {
			/* TLAsset */
		}
	}
}
// register: <Tldraw assetUtils={[MyAssetUtil]} />
```

### 3g. `notifyIfFileNotAllowed` signature changed

**Search:** `notifyIfFileNotAllowed(`

Add `editor` as the first argument:

```tsx
// BEFORE
notifyIfFileNotAllowed(file, options)

// AFTER
notifyIfFileNotAllowed(editor, file, options)
```

### 3h. `getAssetInfo` signature changed

**Search:** `getAssetInfo(`

```tsx
// BEFORE  (throws on failure)
const asset = getAssetInfo(file, options, assetId)

// AFTER  (returns TLAsset|null)
const asset = getAssetInfo(editor, file, assetId)
if (!asset) {
	/* handle null */
}
```

### 3i. `getColorValue` first argument changed

**Search:** `getColorValue(`

The first argument type changed from `TLDefaultColorTheme` to `TLThemeColors`. Update the call to pass `theme.colors[colorMode]` instead of a full theme object.

### 3j. `SvgExportContext.themeId` → `.colorMode`

**Search:** `.themeId`

```tsx
// BEFORE
ctx.themeId // string

// AFTER
ctx.colorMode // 'light' | 'dark'
```

### 3k. `PlainTextLabelProps` / `RichTextLabelProps` property renames

**Search for objects typed as `PlainTextLabelProps` or `RichTextLabelProps`:**

```tsx
// BEFORE
{ font: 'draw', align: 'middle', fill: 'none' }

// AFTER
{ fontFamily: 'draw', textAlign: 'middle' }   // fill removed
```

---

## Step 4 — Migrate overlay components (if applicable)

If the codebase passes overlay components via `TLEditorComponents`, these must be migrated to `OverlayUtil` classes.

**Check for:** `components={{ Brush:`, `components={{ Scribble:`, `components={{ SnapIndicator:`, `components={{ Handle:`, `components={{ Handles:`, `components={{ SelectionForeground:`, `components={{ SelectionBackground:`, `components={{ CollaboratorHint:`, `components={{ ShapeIndicator:`

**Migration pattern:**

```tsx
// BEFORE — React component in TLEditorComponents
function MyBrush({ brush }) {
	const { x, y, w, h } = brush
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: w,
				height: h,
				border: '2px solid blue',
			}}
		/>
	)
}
;<Tldraw components={{ Brush: MyBrush }} />

// AFTER — OverlayUtil with canvas rendering
import { BrushOverlayUtil, type TLBrushOverlay } from 'tldraw'

class MyBrushOverlayUtil extends BrushOverlayUtil {
	override render(ctx: CanvasRenderingContext2D, overlays: TLBrushOverlay[]) {
		const overlay = overlays[0]
		if (!overlay) return
		const { x, y, w, h } = overlay.props
		const zoom = this.editor.getEfficientZoomLevel()
		ctx.strokeStyle = 'blue'
		ctx.lineWidth = 2 / zoom
		ctx.strokeRect(x, y, w, h)
	}
}

;<Tldraw overlayUtils={[MyBrushOverlayUtil]} />
```

**Slot → OverlayUtil class mapping:**

- `Brush` → `BrushOverlayUtil`
- `ZoomBrush` → `ZoomBrushOverlayUtil`
- `Scribble` → `ScribbleOverlayUtil`
- `SnapIndicator` → `SnapIndicatorOverlayUtil`
- `Handle` / `Handles` → `ShapeHandleOverlayUtil`
- `SelectionForeground` / `SelectionBackground` → `SelectionForegroundOverlayUtil`
- `CollaboratorHint` → `CollaboratorHintOverlayUtil`

**Important constraints:**

- `render()` receives a `CanvasRenderingContext2D`, not a React render function — no JSX inside `render()`
- Colors must come from `this.editor.getCurrentTheme().colors[this.editor.getColorMode()]`, not CSS variables
- For overlays that need React/HTML content, use `<Tldraw components={{ InFrontOfTheCanvas: MyLayer }} />` instead

**Shape indicator customization** (`ShapeIndicator` / `ShapeIndicators`) moves to the ShapeUtil:

```tsx
class MyShapeUtil extends ShapeUtil<MyShape> {
	override getIndicatorPath(shape: MyShape): string | null {
		// Return an SVG path string, or null to hide the indicator
		const { w, h } = shape.props
		return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
	}
}
```

---

## Step 5 — Remove CSS variable and selector overrides

**Search for and remove all of the following** (they have no effect in v5):

**CSS variables:**

- `--tl-color-snap`
- `--tl-color-brush-fill`
- `--tl-color-brush-stroke`
- `--tl-color-laser`
- `--tl-layer-overlays-custom`

**CSS class selectors:**

- `.tl-brush`
- `.tl-scribble`
- `.tl-snap-indicator`
- `.tl-handle` (and `.tl-handle--*` variants)
- `.tl-selection__fg__outline`
- `.tl-corner-handle`
- `.tl-text-handle`
- `.tl-corner-crop-handle`
- `.tl-mobile-rotate__*`

Replace color customizations by passing a custom `themes` prop:

```tsx
import { Tldraw, type TLTheme } from 'tldraw'

const myTheme: TLTheme = {
  // extend the default theme
  overlays: {
    brush: { fill: 'rgba(0,0,255,0.1)', stroke: 'blue' },
    snap: '#0000ff',
  },
}

<Tldraw themes={{ my: myTheme }} initialTheme="my" />
```

---

## Step 6 — Verify

```bash
yarn typecheck     # must pass with zero errors
yarn test run      # run unit tests
yarn lint          # check for lint issues
```

Open the editor in the browser and verify:

- Light/dark mode toggle works
- All shapes render correctly
- Overlays (brush, snap, handles) appear correctly
- Asset upload/drop works
- SVG export produces correct output

---

## Reference: full v4 → v5 breaking changes

| v4 API                                   | v5 replacement                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `inferDarkMode` prop                     | `colorScheme` prop (`'light'\|'dark'\|'system'`)                         |
| `useIsDarkMode()` → `boolean`            | `useColorMode()` → `'dark'\|'light'`                                     |
| `getDefaultColorTheme()`                 | `editor.getCurrentTheme().colors[colorMode]`                             |
| `useDefaultColorTheme()`                 | `editor.getCurrentTheme()` + `useColorMode()`                            |
| `DefaultColorThemePalette`               | `editor.getCurrentTheme().colors`                                        |
| `TLDefaultColorTheme` type               | `TLThemeColors`                                                          |
| `FONT_FAMILIES`, `FONT_SIZES`, etc.      | `ShapeUtil.getDefaultDisplayValues()`                                    |
| `assetValidator`                         | `imageAssetValidator` / `videoAssetValidator` / `bookmarkAssetValidator` |
| `getMediaAssetInfoPartial`               | `AssetUtil.getAssetFromFile()`                                           |
| `notifyIfFileNotAllowed(file, opts)`     | `notifyIfFileNotAllowed(editor, file, opts)`                             |
| `getAssetInfo(file, opts, id?)` throws   | `getAssetInfo(editor, file, id?)` returns `TLAsset\|null`                |
| `getColorValue(TLDefaultColorTheme, …)`  | `getColorValue(TLThemeColors, …)`                                        |
| `SvgExportContext.themeId`               | `SvgExportContext.colorMode`                                             |
| `PlainTextLabelProps.font`               | `PlainTextLabelProps.fontFamily`                                         |
| `PlainTextLabelProps.align`              | `PlainTextLabelProps.textAlign`                                          |
| `PlainTextLabelProps.fill`               | removed                                                                  |
| `TLEditorComponents.Brush`               | `BrushOverlayUtil` + `overlayUtils` prop                                 |
| `TLEditorComponents.Scribble`            | `ScribbleOverlayUtil`                                                    |
| `TLEditorComponents.SnapIndicator`       | `SnapIndicatorOverlayUtil`                                               |
| `TLEditorComponents.Handle/Handles`      | `ShapeHandleOverlayUtil`                                                 |
| `TLEditorComponents.SelectionForeground` | `SelectionForegroundOverlayUtil`                                         |
| `TLEditorComponents.CollaboratorHint`    | `CollaboratorHintOverlayUtil`                                            |
| `TLEditorComponents.ShapeIndicator(s)`   | `ShapeUtil.getIndicatorPath()`                                           |
| `Default*` overlay exports               | Subclass the corresponding `*OverlayUtil`                                |
| `LiveCollaborators`                      | `CollaboratorCursorOverlayUtil` etc.                                     |
| `--tl-color-snap` CSS var                | `TLTheme.overlays.snap`                                                  |
| `.tl-brush` CSS selector                 | `BrushOverlayUtil.render()`                                              |
| `.tl-handle*` CSS selectors              | `ShapeHandleOverlayUtil.render()`                                        |
