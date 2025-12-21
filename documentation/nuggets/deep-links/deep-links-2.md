---
title: Making URLs readable with dot encoding
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - deep links
  - URL encoding
  - navigation
---

# Deep link encoding

When we built deep links for tldraw, we wanted URLs that people could actually read. Not just parse, but read—URLs you could edit by hand, share in Slack without looking like gibberish, or type from memory if you needed to. This turns out to be surprisingly hard when your content includes dots.

The problem is shape IDs. Internally, tldraw uses identifiers like `shape:abc.def.ghi`. If you want to link to multiple shapes, you need to separate them somehow. Dots are the obvious choice—they're already in URLs, they don't need encoding, and they look clean: `?d=sabc.def.ghi`. But what happens when a shape ID itself contains a dot?

## The naive approach breaks

Here's what doesn't work: just use `encodeURIComponent()` and split on dots. The URI standard doesn't encode dots—they're valid URL characters. If your shape ID is `a.b.c`, it stays `a.b.c` after encoding. When you parse `sabc.a.b.c`, you get four parts instead of two. You can't tell which dots are separators and which are content.

We could have given up on dots as separators. Use commas, or semicolons, or just encode everything. But that would mean URLs like `?d=sabc%2Cdef%2Cghi` or worse. We wanted the common case to look good.

## Double-encode dots in content

The solution is to encode dots twice. First pass: `encodeURIComponent()` handles spaces, special characters, and everything else. Second pass: replace remaining dots with `%2E`. Now unencoded dots mean separators, and `%2E` means a literal dot in the content.

```typescript
function encodeId(str: string): string {
	// need to encode dots because they are used as separators
	return encodeURIComponent(str).replace(/\./g, '%2E')
}
```

This handles an interesting edge case for free. If your ID literally contains the string `%2E` (percent-two-E as characters), the first pass encodes the `%` to `%25`, producing `%252E`. Decoding reverses this correctly. The system is self-consistent no matter how many layers of encoding you have.

Parsing is straightforward: split on unencoded dots, then decode each piece with standard `decodeURIComponent()`. No custom logic needed.

```typescript
const shapeIds = deepLinkString
	.slice(1)
	.split('.')
	.filter(Boolean)
	.map((id) => createShapeId(decodeURIComponent(id)))
```

## Viewport coordinates get rounded

The other place we optimized for readability is viewport links. These encode four numbers: x, y, width, and height. We round all of them to integers.

```typescript
let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
```

Compare `v342.7891234.178.2341567.1920.123456.1080.789012` (58 characters) to `v343.178.1920.1081` (18 characters). The difference on screen is imperceptible—the viewport might be off by a pixel when restored, but that's fine for general navigation. If you need exact reproduction, you need the full document state, not a URL.

## Format prefixes

We use single-character prefixes to identify link types:

- `s` = shapes (e.g., `sabc.def.ghi`)
- `v` = viewport (e.g., `v342.178.1920.1080`)
- `p` = page (e.g., `pabc`)

Viewport links can optionally include a page ID as a fifth component: `v342.178.1920.1080.page-id`. This only matters for multi-page documents.

Shape IDs are stored internally as `shape:abc`, but we strip the `shape:` prefix before encoding. Only the suffix goes in the URL. The prefix gets added back when parsing.

```typescript
// Encoding
const ids = deepLink.shapeIds.map((id) => encodeId(id.slice('shape:'.length)))

// Decoding
const shapeIds = parts.map((id) => createShapeId(decodeURIComponent(id)))
```

## Navigation behavior

When you navigate to a shapes link, the editor groups shapes by page and finds the page with the most matches. If shape IDs are missing—maybe they were deleted, or you're on a different document—the editor just shows what it can find. If no shapes exist, it falls back to fitting the current page content.

Viewport links restore the exact camera position. The `setCamera` call accepts negative coordinates naturally (the viewport origin can be anywhere on the infinite canvas), and negative numbers in URLs don't need special handling. The minus sign is URL-safe: `v-100.200.1920.1080`.

## URL sync

The `registerDeepLinkListener` method sets up automatic URL updates. It uses a 500ms debounce to avoid thrashing browser history. While you're panning or zooming, the URL lags behind. Once you stop moving, it updates.

```typescript
const scheduleEffect = debounce((execute: () => void) => execute(), opts?.debounceMs ?? 500)
```

The default behavior uses `window.history.replaceState()`, which updates the URL in place without creating new history entries. Each pan/zoom session creates only one history entry after the debounce fires.

The URL gets updated reactively using tldraw's signals system. The `computed` value tracks viewport bounds and page ID automatically. Whenever those change, the effect runs (after debounce) and the URL updates.

## Tradeoffs

We don't enforce URL length limits in code. Browsers handle thousands of characters, though servers often reject URLs longer than 2,048. A hundred shapes with short IDs produces about 290 characters. Twenty shapes with long custom IDs can hit 900. Viewport-only links are short—around 18 to 30 characters.

The alternative to putting state in the URL is using short tokens (`?d=x7h9k2`) that point to server-stored state. That requires infrastructure and database calls. We chose direct encoding to keep deep links client-side and instant.

The human-readable constraint means we can't use the most compact encoding possible. But URLs like `?d=v342.178.1920.1080` look good in browser address bars, work in Slack messages without mangling, and can be edited by hand if you know the format. That's worth the extra characters.

## Source files

- `/packages/editor/src/lib/utils/deepLinks.ts` - Encoding, decoding, and type definitions
- `/packages/editor/src/lib/editor/Editor.ts` - Navigation methods and listener registration
- `/packages/editor/src/lib/TldrawEditor.tsx` - Deep link prop handling and lifecycle integration
