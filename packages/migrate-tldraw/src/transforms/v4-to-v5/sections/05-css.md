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
