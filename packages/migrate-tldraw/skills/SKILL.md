---
name: migrate-v4-to-v5
description: "Migrate a tldraw v4 project to v5.0"
---
# tldraw 4.x → 5.0 migration

> Migrate a tldraw v4 project to v5.0

This skill is a companion to the `@tldraw/migrate` CLI.

## Workflow

1. Run the deterministic migration:

   ```sh
   npx @tldraw/migrate v4-to-v5 .
   ```

   The CLI applies the auto-fixes below and prints a list of flagged lines.

2. Run typecheck to surface remaining errors:

   ```sh
   tsc --noEmit
   ```

3. For each flagged line, apply the change documented in this file. Verify
   the change with the surrounding code before saving — these are pattern
   matches, not AST replacements, so context matters.

## Auto-fixes (handled by the CLI)

| Id | Change | Notes |
| --- | --- | --- |
| `infer-dark-mode-bare` | inferDarkMode (bare prop) → colorScheme="system" | Bare inferDarkMode prop renamed; behaviour preserved (`system`). |
| `infer-dark-mode-true` | inferDarkMode={true} → colorScheme="system" | inferDarkMode={true} renamed; behaviour preserved (`system`). |
| `infer-dark-mode-string-literal` | inferDarkMode="…" → colorScheme="…" | String-literal inferDarkMode renamed to colorScheme. |

## Manual review required (flagged by the CLI)

| Id | Flag | Notes |
| --- | --- | --- |
| `infer-dark-mode-expr` | inferDarkMode={…} (non-literal value) | `inferDarkMode` prop renamed to `colorScheme` in v5 — but the value type changed from boolean to `'light' \| 'dark' \| 'system'`. Verify the value before renaming. |
| `use-is-dark-mode` | useIsDarkMode → useColorMode | Rename to `useColorMode()`. Return type changed from boolean to `'dark' \| 'light'`. Audit every usage — truthy checks like `if (isDark)` will now always be true because `'light'` is also truthy. |
| `get-default-color-theme` | getDefaultColorTheme removed | Removed. Use `editor.getCurrentTheme().colors[editor.getColorMode()]` instead. |
| `use-default-color-theme` | useDefaultColorTheme removed | Removed. Use `editor.getCurrentTheme()` together with `useColorMode()`. |
| `default-color-theme-palette` | DefaultColorThemePalette removed | Removed. Access the palette via `editor.getCurrentTheme().colors`. |
| `default-color-names` | defaultColorNames removed | Removed. Use the theme API instead. |
| `tl-default-color-theme` | TLDefaultColorTheme type removed | Type removed. Use `TLThemeColors` instead. |
| `default-label-color-style` | DefaultLabelColorStyle removed | Removed. Use theme colors directly via `editor.getCurrentTheme().colors[colorMode]`. |
| `get-color-value` | getColorValue first-arg type changed | First argument changed from `TLDefaultColorTheme` to `TLThemeColors`. Pass `theme.colors[colorMode]` instead of a full theme object. |
| `svg-export-context-theme-id` | SvgExportContext.themeId → .colorMode | `SvgExportContext.themeId` renamed to `.colorMode` (type changed from string to `'dark' \| 'light'`). Verify this is an SvgExportContext usage before renaming. |
| `font-families` | FONT_FAMILIES removed | Removed. Font families are now resolved via display values. Override `ShapeUtil.getDefaultDisplayValues` or the matching OverlayUtil method. |
| `font-sizes` | FONT_SIZES removed | Removed. Resolve via display values. |
| `label-font-sizes` | LABEL_FONT_SIZES removed | Removed. Resolve via display values. |
| `stroke-sizes` | STROKE_SIZES removed | Removed. Resolve via display values. |
| `text-props` | TEXT_PROPS removed | Removed. Resolve via display values. |
| `arrow-label-font-sizes` | ARROW_LABEL_FONT_SIZES removed | Removed. Resolve via display values. |
| `asset-validator` | assetValidator removed | Removed. Use `imageAssetValidator`, `videoAssetValidator`, or `bookmarkAssetValidator` for the specific asset type. |
| `get-media-asset-info-partial` | getMediaAssetInfoPartial removed | Removed. Implement `AssetUtil.getAssetFromFile(file, assetId)` on a custom asset util instead. Note: the method takes `(file, assetId)`, not `(editor, file)`. |
| `notify-if-file-not-allowed` | notifyIfFileNotAllowed signature changed | Signature changed: `(file, options)` → `(editor, file, options)`. Pass `editor` as the first argument. |
| `get-asset-info` | getAssetInfo signature changed | Signature changed: `(file, options, assetId?)` → `(editor, file, assetId?)`. Return type changed to `Promise<TLAsset \| null>` (no longer throws). |
| `plain-text-label-props` | PlainTextLabelProps property renames | Property renames on PlainTextLabelProps: `font` → `fontFamily`, `align` → `textAlign`, `fill` removed. |
| `rich-text-label-props` | RichTextLabelProps property renames | Property renames on RichTextLabelProps: `font` → `fontFamily`, `align` → `textAlign`, `fill` removed. |
| `tl-editor-components-type` | TLEditorComponents type — review for removed slots | Several slot keys (Brush, ZoomBrush, Scribble, SnapIndicator, Handle/Handles, SelectionForeground, CollaboratorHint, ShapeIndicator/ShapeIndicators) were removed in v5. Review every key in this file and migrate to the matching `OverlayUtil`. `SelectionBackground` is still valid. |
| `tl-components-type` | TLComponents type — review for removed slots | Several slot keys were removed in v5. Review every key in this file and migrate removed slots to the matching `OverlayUtil`. |
| `slot-brush` | TLEditorComponents.Brush removed | Removed slot. Migrate to `BrushOverlayUtil` and pass via the `overlayUtils` prop. |
| `slot-zoom-brush` | TLEditorComponents.ZoomBrush removed | Removed slot. Migrate to `ZoomBrushOverlayUtil`. |
| `slot-scribble` | TLEditorComponents.Scribble removed | Removed slot. Migrate to `ScribbleOverlayUtil`. |
| `slot-snap-indicator` | TLEditorComponents.SnapIndicator removed | Removed slot. Migrate to `SnapIndicatorOverlayUtil`. |
| `slot-handles` | TLEditorComponents.Handle/Handles removed | Removed slots. Migrate to `ShapeHandleOverlayUtil`. |
| `slot-selection-foreground` | TLEditorComponents.SelectionForeground removed | Removed slot. Migrate to `SelectionForegroundOverlayUtil`. Note: `SelectionBackground` is still a valid slot and does NOT need to migrate. |
| `slot-collaborator-hint` | TLEditorComponents.CollaboratorHint removed | Removed slot. Migrate to `CollaboratorHintOverlayUtil`. |
| `slot-shape-indicator` | TLEditorComponents.ShapeIndicator(s) removed | Removed slots. Customize via `ShapeUtil.getIndicatorPath()` (returns `TLIndicatorPath \| undefined`, not a string). |
| `default-overlay-exports` | Default* overlay component exports removed | Default* overlay component exports removed. Subclass the matching `OverlayUtil` instead. |
| `live-collaborators` | LiveCollaborators removed | Removed. Collaborator overlays are now handled by `CollaboratorCursorOverlayUtil`, `CollaboratorBrushOverlayUtil`, `CollaboratorScribbleOverlayUtil`, and `CollaboratorHintOverlayUtil`. |
| `css-var-color-snap` | CSS variable --tl-color-snap removed | CSS variable removed. Snap colors now come from `TLTheme.colors[mode].snap`. Customize via `SnapIndicatorOverlayUtil`. |
| `css-var-color-brush-fill` | CSS variable --tl-color-brush-fill removed | CSS variable removed. Brush fill comes from `TLTheme.colors[mode].brushFill`. |
| `css-var-color-brush-stroke` | CSS variable --tl-color-brush-stroke removed | CSS variable removed. Brush stroke comes from `TLTheme.colors[mode].brushStroke`. |
| `css-var-color-laser` | CSS variable --tl-color-laser removed | CSS variable removed. Laser color comes from `TLTheme.colors[mode].laser`. |
| `css-var-overlays-custom` | CSS variable --tl-layer-overlays-custom removed | CSS variable removed. Use `TLTheme` entries or `OverlayUtil.render()` for overlay colors. |
| `css-selector-brush` | CSS selector .tl-brush removed | Selector removed. Brush is now drawn by `BrushOverlayUtil` on a canvas context. |
| `css-selector-scribble` | CSS selector .tl-scribble removed | Selector removed. Scribble is now drawn by `ScribbleOverlayUtil`. |
| `css-selector-snap-indicator` | CSS selector .tl-snap-indicator removed | Selector removed. Snap indicator is now drawn by `SnapIndicatorOverlayUtil`. |
| `css-selector-handle` | CSS selector .tl-handle removed | Selector removed. Handles are now drawn by `ShapeHandleOverlayUtil`. |
| `css-selector-selection-fg-outline` | CSS selector .tl-selection__fg__outline removed | Selector removed. Selection foreground is drawn by `SelectionForegroundOverlayUtil`. |
| `css-selector-corner-handle` | CSS selector .tl-corner-handle removed | Selector removed. Corner handles drawn by `ShapeHandleOverlayUtil`. |
| `css-selector-text-handle` | CSS selector .tl-text-handle removed | Selector removed. Text handles drawn by `ShapeHandleOverlayUtil`. |
| `css-selector-corner-crop-handle` | CSS selector .tl-corner-crop-handle removed | Selector removed. |
| `css-selector-mobile-rotate` | CSS selector .tl-mobile-rotate__* removed | Selectors removed. Mobile rotate handle drawn by `ShapeHandleOverlayUtil`. |

## Detailed migration notes

## 1. Color mode

### `inferDarkMode` → `colorScheme`

The `inferDarkMode` prop on `<Tldraw>` and `<TldrawEditor>` was renamed and its
type changed:

| v4 (`inferDarkMode`)     | v5 (`colorScheme`)              |
| ------------------------ | ------------------------------- |
| `true`                   | `'system'`                      |
| `false`                  | omit prop                       |
| `boolean` (any)          | `'light' \| 'dark' \| 'system'` |

The migration script auto-rewrites the three known-safe forms:

```tsx
<Tldraw inferDarkMode />          // → <Tldraw colorScheme="system" />
<Tldraw inferDarkMode={true} />   // → <Tldraw colorScheme="system" />
<Tldraw inferDarkMode="dark" />   // → <Tldraw colorScheme="dark" />
```

Anything with a non-literal value is flagged for manual review:

```tsx
<Tldraw inferDarkMode={prefersDark} />   // FLAGGED — verify the value type
```

You almost certainly want one of:

```tsx
<Tldraw colorScheme={prefersDark ? 'dark' : 'light'} />
<Tldraw colorScheme="system" />
```

### `useIsDarkMode` → `useColorMode`

The hook was renamed and its **return type changed** from `boolean` to
`'dark' | 'light'`. Truthy checks against the result will silently break:

```tsx
// BEFORE — returns boolean
const isDark = useIsDarkMode()
if (isDark) { ... }                 // ✓ worked
return <Icon dark={isDark} />       // ✓ worked

// AFTER — returns 'dark' | 'light' (both truthy)
const mode = useColorMode()
if (mode) { ... }                   // ✗ always true; 'light' is also truthy
return <Icon dark={mode} />         // ✗ type error: string not boolean

// FIX
const colorMode = useColorMode()
const isDark = colorMode === 'dark'
if (isDark) { ... }
return <Icon dark={isDark} />
```

## 2. Theme

### `getDefaultColorTheme` / `useDefaultColorTheme` → `editor.getCurrentTheme()`

Both helpers are removed. Theme access goes through the editor:

```tsx
// BEFORE
import { getDefaultColorTheme } from 'tldraw'
const theme = getDefaultColorTheme({ isDarkMode: true })
const fill = theme.blue.semi

// AFTER
const theme = editor.getCurrentTheme()
const colors = theme.colors[editor.getColorMode()]   // 'light' | 'dark'
const fill = colors.blue.semi
```

Inside a React component:

```tsx
const editor = useEditor()
const colorMode = useColorMode()
const colors = editor.getCurrentTheme().colors[colorMode]
```

Inside a `ShapeUtil`/`OverlayUtil` method, use `this.editor`:

```tsx
override component(shape: MyShape) {
  const colors = this.editor.getCurrentTheme().colors[this.editor.getColorMode()]
  return <rect fill={colors.blue.semi} />
}
```

### `TLTheme` shape

The `TLTheme` interface is defined in `@tldraw/tlschema`:

```ts
interface TLTheme {
  id: TLThemeId
  fontSize: number
  lineHeight: number
  strokeWidth: number
  fonts: TLThemeFonts
  colors: { light: TLThemeColors; dark: TLThemeColors }
}
```

There is **no** `overlays` field on `TLTheme`. Brush, snap, and laser colors
live on `TLThemeColors` directly: `colors.light.brushFill`,
`colors.light.brushStroke`, `colors.light.snap`, `colors.light.laser`,
`colors.light.selectionStroke`, etc.

To register a custom theme:

```tsx
import { Tldraw, DEFAULT_THEME, type TLTheme } from 'tldraw'

const myTheme: TLTheme = {
  id: 'custom',
  fontSize: DEFAULT_THEME.fontSize,
  lineHeight: DEFAULT_THEME.lineHeight,
  strokeWidth: DEFAULT_THEME.strokeWidth,
  fonts: DEFAULT_THEME.fonts,
  colors: {
    light: { ...DEFAULT_THEME.colors.light, brushFill: 'rgba(0,0,255,0.1)' },
    dark: { ...DEFAULT_THEME.colors.dark, brushFill: 'rgba(0,0,255,0.2)' },
  },
}

<Tldraw themes={{ custom: myTheme }} initialTheme="custom" />
```

### `getColorValue`

The first argument changed from `TLDefaultColorTheme` to `TLThemeColors`:

```tsx
// BEFORE
getColorValue(theme, color, 'semi')

// AFTER
getColorValue(theme.colors[colorMode], color, 'semi')
```

### Removed exports

- `DefaultColorThemePalette` → access via `editor.getCurrentTheme().colors`
- `defaultColorNames` → use the theme API
- `TLDefaultColorTheme` (type) → `TLThemeColors`
- `DefaultLabelColorStyle` → use theme colors directly

## 3. Display values

The constants `FONT_FAMILIES`, `FONT_SIZES`, `LABEL_FONT_SIZES`,
`STROKE_SIZES`, `TEXT_PROPS`, and `ARROW_LABEL_FONT_SIZES` are removed.
Their values are now resolved through the **display values** pipeline so that
themes and color modes can override them per shape.

For custom shape utils, override `getDefaultDisplayValues`:

```tsx
class MyShapeUtil extends ShapeUtil<MyShape> {
  override getDefaultDisplayValues(_editor, _shape, _theme, _colorMode) {
    return {
      fontSize: { s: 12, m: 16, l: 24, xl: 36 }[shape.props.size],
      strokeWidth: { s: 1, m: 2, l: 3, xl: 4 }[shape.props.size],
    }
  }
}
```

For overlay utils, the same method exists and receives:

```ts
getDefaultDisplayValues(
  editor: Editor,
  overlay: Overlay,
  theme: TLTheme,
  colorMode: 'dark' | 'light',
): DisplayValues
```

For *default* shape utils where you want to *augment* (not replace) the
defaults, override `getCustomDisplayValues` with a `Partial<DisplayValues>`
return value.

In a shape's `component` / `indicator` method, read from the display values
object that's passed in by the framework rather than reaching for a constant.

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

## 5. CSS variables and selectors

Overlays no longer render to the DOM; they paint to a single canvas managed
by `OverlayUtil`. As a result, the CSS variables and selectors that used to
style brush, scribble, snap indicator, handles, and selection foreground are
all unused in v5.

### Removed CSS variables

```
--tl-color-snap
--tl-color-brush-fill
--tl-color-brush-stroke
--tl-color-laser
--tl-layer-overlays-custom
```

If you were customizing these to brand the overlay colors, move the values
into a custom `TLTheme`:

```tsx
import { Tldraw, DEFAULT_THEME, type TLTheme } from 'tldraw'

const theme: TLTheme = {
  ...DEFAULT_THEME,
  colors: {
    light: { ...DEFAULT_THEME.colors.light, brushFill: 'rgba(255, 0, 0, 0.1)' },
    dark: { ...DEFAULT_THEME.colors.dark, brushFill: 'rgba(255, 0, 0, 0.2)' },
  },
}

<Tldraw themes={{ branded: theme }} initialTheme="branded" />
```

### Removed CSS selectors

```
.tl-brush
.tl-scribble
.tl-snap-indicator
.tl-handle, .tl-corner-handle, .tl-text-handle, .tl-corner-crop-handle
.tl-mobile-rotate__*
.tl-selection__fg__outline
```

These are no longer rendered to the DOM. Customizations should move to the
matching `OverlayUtil.render()` (see [4. Overlays](#4-overlays)) or use
`InFrontOfTheCanvas` when a real DOM overlay is required.

Other tldraw CSS selectors (UI chrome, panels, dialogs) remain unchanged.

## 6. Asset system

The asset system was reorganised so that asset extraction lives on the asset
util itself rather than in a free-floating `getMediaAssetInfoPartial` helper.

### `AssetUtil.getAssetFromFile`

Implement this method on a custom `AssetUtil` subclass to extract metadata
from a `File` and produce an asset record:

```tsx
import { AssetUtil, type TLAssetId, type TLImageAsset, AssetRecordType } from 'tldraw'

class MyImageAssetUtil extends AssetUtil<TLImageAsset> {
  static override type = 'image' as const

  override async getAssetFromFile(
    file: File,
    assetId: TLAssetId,
  ): Promise<TLImageAsset | null> {
    const src = URL.createObjectURL(file)
    return AssetRecordType.create({
      id: assetId,
      type: 'image',
      typeName: 'asset',
      props: { src, w: 0, h: 0, name: file.name, isAnimated: false, mimeType: file.type },
      meta: {},
    }) as TLImageAsset
  }
}
```

The signature is `(file: File, assetId: TLAssetId)`. There is **no** `editor`
parameter — access the editor via `this.editor` if you need it (e.g. to read
config, dispatch events, or trigger uploads).

### `notifyIfFileNotAllowed` and `getAssetInfo`

Both helpers gained an `editor` first argument:

```ts
// BEFORE
notifyIfFileNotAllowed(file, options)
const info = await getAssetInfo(file, options, assetId)

// AFTER
notifyIfFileNotAllowed(editor, file, options)
const info = await getAssetInfo(editor, file, assetId)
```

`getAssetInfo` now returns `Promise<TLAsset | null>` (instead of throwing on
unsupported files), so call sites should `if (!info) return` rather than
relying on `try/catch`.

### Removed exports

- `getMediaAssetInfoPartial` — implement `AssetUtil.getAssetFromFile` instead.
- `assetValidator` — use `imageAssetValidator`, `videoAssetValidator`, or
  `bookmarkAssetValidator` for the specific asset type. There is no longer a
  single union validator export.

## 7. SVG export

`SvgExportContext.themeId` was renamed to `SvgExportContext.colorMode`, and
its type changed from `string` to `'dark' | 'light'`. This affects custom
`ShapeUtil.toSvg()` implementations and any consumer of `Editor.getSvgString`
that inspects the context object.

```tsx
// BEFORE
override toSvg(shape: MyShape, ctx: SvgExportContext) {
  const isDark = ctx.themeId === 'dark'
  const fill = isDark ? '#fff' : '#000'
  return <rect width={shape.props.w} height={shape.props.h} fill={fill} />
}

// AFTER
override toSvg(shape: MyShape, ctx: SvgExportContext) {
  const isDark = ctx.colorMode === 'dark'
  const fill = isDark ? '#fff' : '#000'
  return <rect width={shape.props.w} height={shape.props.h} fill={fill} />
}
```

A `themeId` member access in your code does **not** automatically mean an
`SvgExportContext` — the migration script flags every `.themeId` access and
asks you to verify before renaming. Other types (e.g. theme records in your
own data model) may legitimately use `themeId`.

Other context fields are unchanged: `isDarkMode` is still present (kept for
backwards compatibility in addition to the typed `colorMode`).

## 8. Label props

`PlainTextLabelProps` and `RichTextLabelProps` had three property changes:

| v4         | v5           |
| ---------- | ------------ |
| `font`     | `fontFamily` |
| `align`    | `textAlign`  |
| `fill`     | (removed)    |

Update both the property reads inside your shape `component()` and any object
construction that built these prop bags:

```tsx
// BEFORE
<text
  fontFamily={FONT_FAMILIES[font]}
  textAnchor={align === 'middle' ? 'middle' : 'start'}
  fill={getColorValue(theme, fill, 'semi')}
>

// AFTER
<text
  fontFamily={displayValues.fontFamily}
  textAnchor={textAlign === 'middle' ? 'middle' : 'start'}
  // fill removed: rich text labels now manage color via the theme + display values
>
```

If you were storing label props on a custom shape, also update the validator:

```ts
const validator = T.object<MyShape['props']>({
  text: T.string,
  fontFamily: T.string,         // was `font`
  textAlign: T.literalEnum('start', 'middle', 'end'),  // was `align`
  // fill: removed
})
```

Migration the data on disk: any shape records persisted with `font`/`align`
keys must be normalised on load. Add a store migration:

```ts
// in your shape's `migrations` array
{
  id: createShapePropsMigrationId(MyShapeUtil.type, 1),
  scope: 'record',
  filter: (record) => record.typeName === 'shape' && record.type === MyShapeUtil.type,
  up: (record) => {
    const { font, align, fill, ...rest } = record.props
    record.props = { ...rest, fontFamily: font, textAlign: align }
  },
}
```

## Quality bar

- Do **not** add `as any` or `as unknown as X` to silence type errors. If the
  type genuinely changed, change the consumer to match.
- Re-run `npx @tldraw/migrate v4-to-v5 . --dry-run` after each
  batch of fixes to confirm the flag count is going down, not sideways.
- When in doubt, search for similar usages elsewhere in the codebase and
  match them — consistency matters more than cleverness.
