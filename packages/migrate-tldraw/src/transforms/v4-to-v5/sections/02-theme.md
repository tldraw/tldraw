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
