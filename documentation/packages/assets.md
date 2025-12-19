---
title: '@tldraw/assets'
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - assets
  - icons
  - fonts
  - translations
  - i18n
---

The `@tldraw/assets` package contains all static assets used by tldraw, including icons, fonts, translations, and embed service icons. It provides multiple export strategies for different bundling scenarios and ensures consistent asset access across the entire application.

## Overview

This package centralizes all tldraw static assets in one location:

- **Icons**: 80+ UI icons in an optimized SVG sprite
- **Fonts**: IBM Plex family (sans, serif, mono) and Shantell Sans for handwriting
- **Translations**: 40+ languages with regional variants
- **Embed icons**: Service icons for embedded content (YouTube, Figma, etc.)

The package offers multiple ways to consume assets depending on your bundler and hosting setup.

## Asset categories

### Icons

All icons are consolidated into a single SVG sprite file for efficient loading:

```typescript
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

const assets = getAssetUrlsByImport()

// Access icons via fragment identifier
const pointerIcon = assets.icons['tool-pointer'] // icon-sprite.svg#tool-pointer
const rectangleIcon = assets.icons['geo-rectangle']
```

**Icon categories:**

| Category | Examples                                                   |
| -------- | ---------------------------------------------------------- |
| Tools    | `tool-pointer`, `tool-pencil`, `tool-arrow`, `tool-text`   |
| Geometry | `geo-rectangle`, `geo-ellipse`, `geo-triangle`, `geo-star` |
| UI       | `chevron-down`, `align-center`, `zoom-in`, `undo`, `redo`  |
| Actions  | `duplicate`, `delete`, `lock`, `group`, `share`            |

### Fonts

Complete font families with multiple weights and styles:

```typescript
const assets = getAssetUrlsByImport()

// Sans-serif (IBM Plex Sans) - UI and interface text
assets.fonts.tldraw_sans // Medium weight
assets.fonts.tldraw_sans_bold // Bold weight
assets.fonts.tldraw_sans_italic // Medium italic
assets.fonts.tldraw_sans_italic_bold

// Serif (IBM Plex Serif) - formal text
assets.fonts.tldraw_serif
assets.fonts.tldraw_serif_bold
assets.fonts.tldraw_serif_italic
assets.fonts.tldraw_serif_italic_bold

// Monospace (IBM Plex Mono) - code
assets.fonts.tldraw_mono
assets.fonts.tldraw_mono_bold
assets.fonts.tldraw_mono_italic
assets.fonts.tldraw_mono_italic_bold

// Handwritten (Shantell Sans) - draw/sketch style
assets.fonts.tldraw_draw
assets.fonts.tldraw_draw_bold
assets.fonts.tldraw_draw_italic
assets.fonts.tldraw_draw_italic_bold
```

### Translations

Comprehensive internationalization support:

```typescript
// Language metadata
import languages from '@tldraw/assets/translations/languages.json'
// [{ locale: 'en', label: 'English' }, { locale: 'es', label: 'Espanol' }, ...]

// Translation files
const assets = getAssetUrlsByImport()
assets.translations.en // English
assets.translations.es // Spanish
assets.translations['zh-cn'] // Simplified Chinese
assets.translations['pt-br'] // Brazilian Portuguese
```

**Supported languages include:**

- European: English, German, French, Spanish, Italian, Dutch, Russian, Polish
- Asian: Chinese (Simplified/Traditional), Japanese, Korean, Hindi, Thai
- Middle Eastern: Arabic, Persian, Hebrew, Urdu
- Regional variants: Brazilian Portuguese, Latin American Spanish

### Embed icons

Service icons for embedded external content:

```typescript
const assets = getAssetUrlsByImport()

assets.embedIcons.youtube
assets.embedIcons.figma
assets.embedIcons.github_gist
assets.embedIcons.google_maps
assets.embedIcons.codepen
assets.embedIcons.codesandbox
// ... and more
```

**Supported services:**

- Development: GitHub Gist, CodePen, CodeSandbox, Replit, Observable
- Design: Figma, Excalidraw, tldraw
- Media: YouTube, Vimeo, Spotify
- Productivity: Google Maps, Google Slides, Google Calendar
- Other: Desmos, Felt, Val Town, Scratch

## Export strategies

The package provides three export patterns for different bundling needs.

### Import-based (`imports.js`)

Best for bundlers like Webpack or Vite that can process static imports:

```typescript
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

const assets = getAssetUrlsByImport()
// Assets are bundled and processed by your build tool
```

This strategy uses ES module imports that bundlers can optimize, tree-shake, and include in your build.

### URL-based (`urls.js`)

Best for ESM environments using `import.meta.url`:

```typescript
import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'

const assets = getAssetUrlsByMetaUrl()
// URLs resolved relative to the module location
```

### Self-hosted (`selfHosted.js`)

Best for custom hosting or CDN deployment:

```typescript
import { getAssetUrls } from '@tldraw/assets/selfHosted'

// With base URL for CDN
const assets = getAssetUrls({
	baseUrl: 'https://cdn.example.com/tldraw-assets',
})

// With custom URL transformer
const assets = getAssetUrls((assetUrl) => {
	return `https://assets.myapp.com/${assetUrl}?v=${BUILD_HASH}`
})
```

## URL formatting

The `formatAssetUrl` function handles URL resolution:

```typescript
import { formatAssetUrl } from '@tldraw/assets'

// Data URLs pass through unchanged
formatAssetUrl('data:image/png;base64,...') // unchanged

// Absolute URLs pass through unchanged
formatAssetUrl('https://example.com/icon.svg') // unchanged

// Relative URLs get baseUrl prefix
formatAssetUrl('./icons/tool.svg', { baseUrl: 'https://cdn.example.com' })
// → 'https://cdn.example.com/icons/tool.svg'

// Custom transformer function
formatAssetUrl('./icons/tool.svg', (url) => `https://cdn.example.com/${url}`)
```

## Usage patterns

### Basic usage with React

```typescript
import { Tldraw } from 'tldraw'
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

const assetUrls = getAssetUrlsByImport()

function App() {
  return <Tldraw assetUrls={assetUrls} />
}
```

### CDN deployment

```typescript
import { getAssetUrls } from '@tldraw/assets/selfHosted'

const assetUrls = getAssetUrls({
	baseUrl: process.env.CDN_URL || '/assets',
})
```

### Custom asset hosting

```typescript
const assetUrls = getAssetUrls((assetUrl) => {
	// Add cache-busting version
	const version = process.env.BUILD_ID
	return `https://assets.myapp.com/${assetUrl}?v=${version}`
})
```

## Performance optimizations

### Icon sprite system

All icons are merged into a single SVG sprite:

```svg
<!-- Single SVG file contains all icons as symbols -->
<svg>
  <symbol id="tool-pointer">...</symbol>
  <symbol id="geo-rectangle">...</symbol>
  <symbol id="align-center">...</symbol>
</svg>
```

Benefits:

- Single HTTP request for all icons
- Browser caches entire icon set
- Fragment identifiers (`#icon-name`) for access
- Small file size due to SVG optimization

### Font loading

Fonts use WOFF2 format for optimal compression:

```css
@font-face {
	font-family: 'tldraw-sans';
	src: url('./fonts/IBMPlexSans-Medium.woff2') format('woff2');
	font-weight: 500;
	font-style: normal;
}
```

### Asset caching

For production deployments:

```typescript
// Long-term caching with version-based cache busting
const assetUrls = getAssetUrls({
	baseUrl: `https://cdn.example.com/assets/v${APP_VERSION}`,
})
```

## Asset generation

Assets are automatically generated by the build system:

```bash
# Regenerate asset exports after adding/modifying assets
yarn refresh-assets
```

This script:

1. Scans asset directories for fonts, icons, translations
2. Generates typed exports for each asset
3. Creates multiple export strategies (imports, urls, selfHosted)
4. Generates TypeScript definitions

Generated files include:

- `imports.js` / `imports.d.ts` - ES module imports
- `urls.js` / `urls.d.ts` - import.meta.url resolution
- `selfHosted.js` / `selfHosted.d.ts` - relative path resolution
- `types.d.ts` - shared TypeScript definitions

## Type definitions

Full TypeScript support for asset URLs:

```typescript
interface AssetUrls {
	fonts: {
		tldraw_sans: string
		tldraw_sans_bold: string
		// ... all font variants
	}
	icons: {
		'tool-pointer': string
		'geo-rectangle': string
		// ... all icon names
	}
	translations: {
		en: string
		es: string
		// ... all locale codes
	}
	embedIcons: {
		youtube: string
		figma: string
		// ... all embed services
	}
}
```

## Key files

- packages/assets/imports.js - Import-based asset exports
- packages/assets/urls.js - URL-based asset exports
- packages/assets/selfHosted.js - Self-hosted asset exports
- packages/assets/fonts/ - WOFF2 font files
- packages/assets/icons/ - SVG icon sprite
- packages/assets/translations/ - JSON translation files
- packages/assets/embed-icons/ - Embed service PNG icons
- internal/scripts/refresh-assets.ts - Asset generation script

## Related

- [@tldraw/tldraw](./tldraw.md) - Main SDK that consumes assets
- [@tldraw/editor](./editor.md) - Editor that renders icons and uses fonts
