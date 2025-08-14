# Assets Package Context

## Overview

The `@tldraw/assets` package contains all static assets used by tldraw, including icons, fonts, translations, embed icons, and watermarks. It provides multiple export strategies for different bundling scenarios and ensures consistent asset access across the entire application.

## Architecture

### Asset Categories

#### Icons System

Single SVG sprite with fragment identifiers for efficient icon delivery:

```typescript
// All icons consolidated into one optimized SVG file
icons: {
  'tool-pointer': iconsIcon0MergedSvg + '#tool-pointer',
  'tool-pencil': iconsIcon0MergedSvg + '#tool-pencil',
  'geo-rectangle': iconsIcon0MergedSvg + '#geo-rectangle',
  'align-center': iconsIcon0MergedSvg + '#align-center'
  // 80+ icons covering tools, shapes, UI elements, formatting
}
```

**Icon Categories:**

- **Tool Icons**: `tool-pointer`, `tool-pencil`, `tool-arrow`, `tool-text`, etc.
- **Geometry Icons**: `geo-rectangle`, `geo-ellipse`, `geo-triangle`, `geo-star`, etc.
- **UI Icons**: `chevron-*`, `align-*`, `zoom-*`, `undo`, `redo`, etc.
- **Action Icons**: `duplicate`, `delete`, `lock`, `group`, `share`, etc.

#### Typography System

Complete font family with multiple weights and styles:

```typescript
fonts: {
  // IBM Plex Mono (code/monospace)
  tldraw_mono: './fonts/IBMPlexMono-Medium.woff2',
  tldraw_mono_bold: './fonts/IBMPlexMono-Bold.woff2',
  tldraw_mono_italic: './fonts/IBMPlexMono-MediumItalic.woff2',
  tldraw_mono_italic_bold: './fonts/IBMPlexMono-BoldItalic.woff2',

  // IBM Plex Sans (UI/interface)
  tldraw_sans: './fonts/IBMPlexSans-Medium.woff2',
  tldraw_sans_bold: './fonts/IBMPlexSans-Bold.woff2',
  tldraw_sans_italic: './fonts/IBMPlexSans-MediumItalic.woff2',
  tldraw_sans_italic_bold: './fonts/IBMPlexSans-BoldItalic.woff2',

  // IBM Plex Serif (formal text)
  tldraw_serif: './fonts/IBMPlexSerif-Medium.woff2',
  tldraw_serif_bold: './fonts/IBMPlexSerif-Bold.woff2',
  tldraw_serif_italic: './fonts/IBMPlexSerif-MediumItalic.woff2',
  tldraw_serif_italic_bold: './fonts/IBMPlexSerif-BoldItalic.woff2',

  // Shantell Sans (handwritten/draw style)
  tldraw_draw: './fonts/Shantell_Sans-Informal_Regular.woff2',
  tldraw_draw_bold: './fonts/Shantell_Sans-Informal_Bold.woff2',
  tldraw_draw_italic: './fonts/Shantell_Sans-Informal_Regular_Italic.woff2',
  tldraw_draw_italic_bold: './fonts/Shantell_Sans-Informal_Bold_Italic.woff2'
}
```

#### Internationalization System

Comprehensive translation support for 40+ languages:

```typescript
// Language metadata for UI
translations/languages.json: [
  { "locale": "en", "label": "English" },
  { "locale": "es", "label": "Español" },
  { "locale": "fr", "label": "Français" },
  { "locale": "zh-cn", "label": "简体中文" },
  // 40+ supported locales
]

// Translation file mapping
translations: {
  en: './translations/en.json',
  es: './translations/es.json',
  'zh-cn': './translations/zh-cn.json',
  'pt-br': './translations/pt-br.json',
  // Region-specific variants supported
}
```

#### Embed Icons

Service icons for external content embedding:

```typescript
embedIcons: {
  youtube: './embed-icons/youtube.png',
  figma: './embed-icons/figma.png',
  github_gist: './embed-icons/github_gist.png',
  google_maps: './embed-icons/google_maps.png',
  codepen: './embed-icons/codepen.png',
  // 18 popular services supported
}
```

### Export Strategies

#### Import-Based Assets (`imports.js`)

Direct ES module imports for bundler optimization:

```javascript
import embedIconsYoutubePng from './embed-icons/youtube.png'
import fontsIBMPlexSansBoldWoff2 from './fonts/IBMPlexSans-Bold.woff2'

export function getAssetUrlsByImport(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl(fontsIBMPlexSansBoldWoff2, opts),
		},
		embedIcons: {
			youtube: formatAssetUrl(embedIconsYoutubePng, opts),
		},
	}
}
```

#### URL-Based Assets (`urls.js`)

Runtime URL generation using `import.meta.url`:

```javascript
export function getAssetUrlsByMetaUrl(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl(
				new URL('./fonts/IBMPlexSans-Bold.woff2', import.meta.url).href,
				opts
			),
		},
	}
}
```

#### Self-Hosted Assets (`selfHosted.js`)

Relative path resolution for custom hosting:

```javascript
export function getAssetUrls(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl('./fonts/IBMPlexSans-Bold.woff2', opts),
		},
	}
}
```

### Asset URL Formatting

#### `formatAssetUrl` Utility

Flexible asset URL processing supporting multiple hosting scenarios:

```typescript
function formatAssetUrl(assetUrl: AssetUrl, format: AssetUrlOptions = {}) {
	const assetUrlString = typeof assetUrl === 'string' ? assetUrl : assetUrl.src

	// Custom formatter function
	if (typeof format === 'function') return format(assetUrlString)

	const { baseUrl = '' } = format

	// Data URLs pass through unchanged
	if (assetUrlString.startsWith('data:')) return assetUrlString

	// Absolute URLs pass through unchanged
	if (assetUrlString.match(/^https?:\/\//)) return assetUrlString

	// Relative URLs get baseUrl prefix
	return `${baseUrl.replace(/\/$/, '')}/${assetUrlString.replace(/^\.?\//, '')}`
}
```

**Use Cases:**

- **CDN Hosting**: Add baseUrl for CDN deployment
- **Custom Domains**: Redirect assets to custom asset servers
- **Development**: Serve assets from local dev server
- **Self-Hosting**: Package assets with application bundle

### Type System

#### Asset URL Types

Type-safe asset URL handling:

```typescript
type AssetUrl = string | { src: string }
type AssetUrlOptions = { baseUrl?: string } | ((assetUrl: string) => string)

interface AssetUrls {
	fonts: Record<string, string> // 16 font variants
	icons: Record<string, string> // 80+ UI icons
	translations: Record<string, string> // 40+ language files
	embedIcons: Record<string, string> // 18 service icons
}
```

### Build System Integration

#### Automatic Generation

Asset exports are automatically generated from source files:

```javascript
// Generated by internal/scripts/refresh-assets.ts
// Do not edit manually. Or do, I'm a comment, not a cop.
```

**Generated Files:**

- `imports.js` + `imports.d.ts` - ES module imports
- `urls.js` + `urls.d.ts` - import.meta.url resolution
- `selfHosted.js` + `selfHosted.d.ts` - relative path resolution
- `types.d.ts` - TypeScript definitions

#### Vite-Specific Exports

Special handling for Vite bundler:

```javascript
// imports.vite.js - Vite-optimized asset imports
// imports.vite.d.ts - Vite-specific type definitions
```

## Language Support

### Translation Architecture

Comprehensive internationalization with regional variants:

**Language Coverage:**

- **European**: en, de, fr, es, it, nl, ru, pl, etc.
- **Asian**: zh-cn, zh-tw, ja, ko-kr, hi-in, th, etc.
- **Middle Eastern**: ar, fa, he, ur
- **Regional Variants**: pt-br/pt-pt, gu-in/hi-in, zh-cn/zh-tw

**Translation Structure:**

```json
// Each translation file contains UI strings
{
	"action.align-bottom": "Align bottom",
	"action.bring-forward": "Bring forward",
	"tool.select": "Select",
	"style.color.black": "Black"
}
```

### Language Metadata

Centralized language configuration:

```json
// translations/languages.json
[
	{ "locale": "en", "label": "English" },
	{ "locale": "zh-cn", "label": "简体中文" },
	{ "locale": "ar", "label": "عربي" }
]
```

## External Service Integration

### Embed Service Icons

Visual branding for embedded content:

**Supported Services:**

- **Development**: GitHub Gist, CodePen, CodeSandbox, Replit, Observable
- **Design**: Figma, Excalidraw, tldraw
- **Media**: YouTube, Vimeo, Spotify
- **Productivity**: Google Maps, Google Slides, Google Calendar
- **Other**: Desmos, Felt, Val Town, Scratch

**Icon Usage:**

```typescript
// Icons displayed when embedding external content
embedIcons: {
  figma: './embed-icons/figma.png',
  youtube: './embed-icons/youtube.png',
  github_gist: './embed-icons/github_gist.png'
}
```

## Performance Optimizations

### Icon Sprite System

All icons merged into single SVG sprite for optimal loading:

```svg
<!-- icons/icon/0_merged.svg -->
<svg>
  <symbol id="tool-pointer">...</symbol>
  <symbol id="geo-rectangle">...</symbol>
  <symbol id="align-center">...</symbol>
  <!-- All icons as symbols -->
</svg>
```

**Benefits:**

- **Single HTTP Request**: All icons in one file
- **Browser Caching**: Icons cached together
- **Fragment Addressing**: Access via `#icon-name`
- **Bundle Optimization**: Unused icons can be tree-shaken

### Font Loading Strategy

Optimized web font delivery:

```css
/* Each font variant as separate WOFF2 file */
@font-face {
	font-family: 'tldraw-sans';
	src: url('./fonts/IBMPlexSans-Medium.woff2') format('woff2');
	font-weight: 500;
	font-style: normal;
}
```

### Asset Bundling Flexibility

Multiple export patterns support different bundling needs:

**Import Strategy**: Best for Webpack/Rollup with asset processing
**URL Strategy**: Best for ESM environments with import.meta.url
**Self-Hosted Strategy**: Best for custom asset hosting solutions

## Development Workflow

### Asset Pipeline

Automated asset management and optimization:

1. **Source Assets**: Fonts, icons, images stored in organized directories
2. **Build Script**: `internal/scripts/refresh-assets.ts` processes assets
3. **Generated Exports**: Multiple export formats created automatically
4. **Type Generation**: TypeScript definitions auto-generated
5. **Bundle Integration**: Assets ready for different bundler strategies

### Asset Updates

Standardized process for asset modifications:

1. **Add Assets**: Place new assets in appropriate directories
2. **Run Build**: Execute asset refresh script
3. **Commit Generated**: Include auto-generated export files
4. **Type Safety**: TypeScript ensures valid asset references

## Integration Patterns

### Basic Asset Usage

```typescript
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

const assetUrls = getAssetUrlsByImport()
const iconUrl = assetUrls.icons['tool-pointer']
const fontUrl = assetUrls.fonts.tldraw_sans_bold
```

### Custom Base URL

```typescript
import { getAssetUrls } from '@tldraw/assets/selfHosted'

const assetUrls = getAssetUrls({
	baseUrl: 'https://cdn.example.com/tldraw-assets',
})
```

### Custom URL Transformation

```typescript
const assetUrls = getAssetUrls((assetUrl) => {
	// Custom logic for asset URL generation
	return `https://assets.myapp.com/${assetUrl}?v=${buildHash}`
})
```

## Key Benefits

### Asset Management

- **Centralized Assets**: All static resources in one package
- **Type Safety**: TypeScript definitions for all asset references
- **Multiple Export Strategies**: Support for different bundling workflows
- **Automatic Generation**: Asset exports generated from source files

### Performance

- **Optimized Loading**: Icon sprites and font subsetting
- **Flexible Hosting**: Support for CDNs and custom asset servers
- **Bundle Efficiency**: Tree-shakable exports for unused assets
- **Caching Strategy**: Asset URLs designed for effective browser caching

### Internationalization

- **Global Reach**: 40+ supported languages with regional variants
- **Extensible Translation**: Easy to add new languages
- **Fallback Strategy**: Graceful degradation to English
- **Cultural Adaptation**: Right-to-left language support

### Developer Experience

- **Simple Integration**: Import and use pattern for all assets
- **Build-Time Safety**: TypeScript prevents invalid asset references
- **Hot Reloading**: Development-friendly asset serving
- **Documentation**: Clear asset categorization and naming

### Maintenance

- **Single Source**: All assets managed in one location
- **Automated Updates**: Build scripts maintain export consistency
- **Version Control**: Asset changes tracked with application changes
- **Dependency Management**: Minimal external dependencies for assets
