---
title: Deep link encoding
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - deep links
  - URL encoding
  - navigation
---

# Deep link encoding

When we added deep links to tldraw, we wanted URLs that looked readable rather than like gibberish. A viewport link should look like `?d=v342.178.1920.1080`, not `?d=v%2D342%2E178%2E1920%2E1080`. But readable URLs come with a problem: what happens when a shape ID contains dots?

## The ambiguity problem

Deep links use dots as separators. A link to three shapes with IDs `abc`, `def`, and `ghi` looks like `?d=sabc.def.ghi`. The parser splits on dots and gets three IDs.

But shape IDs can be anything, including strings that contain literal dots. If your shape ID is `a.b.c`, the URL becomes `?d=sa.b.c` after standard URL encoding. That's identical to a link targeting a shape with ID `a`, another with ID `b`, and another with ID `c`.

The standard approach fails. JavaScript's `encodeURIComponent()` doesn't touch dots because they're valid URL characters. If your shape ID is `a.b.c`, it encodes to `a.b.c` unchanged. The parser has no way to tell the difference between separators and content.

## Double-encoding

We solve this by encoding dots twice:

```typescript
function encodeId(str: string): string {
  // need to encode dots because they are used as separators
  return encodeURIComponent(str).replace(/\./g, '%2E')
}
```

The first pass with `encodeURIComponent()` handles spaces, special characters, and everything else. The second pass explicitly encodes any remaining dots. Now unencoded dots are always separators, and `%2E` is always a literal dot in the content.

A shape with ID `a.b.c` encodes to `a%2Eb%2Ec`, and the URL becomes `?d=sa%2Eb%2Ec`. The parser splits on unencoded dots, finds one component, decodes it with standard `decodeURIComponent()`, and recovers `a.b.c`.

This works because percent-encoding is self-consistent. If your shape ID is the literal string `a%2Eb` (containing the characters `%`, `2`, `E`, and `b`), the first encoding pass turns it into `a%252Eb`. The percent sign itself gets encoded to `%25`. Decode that and you get `a%2Eb` back. The system handles arbitrary nesting without custom decoding logic.

## Viewport precision

Viewport links encode four numbers: `v{x}.{y}.{w}.{h}`. The naive approach would preserve full floating-point precision, giving URLs like `v342.7891234.178.2341567.1920.123456.1080.789012`.

We round to integers instead:

```typescript
let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
```

Sub-pixel viewport precision doesn't matter on screen. The 58-character URL becomes 18 characters, and the restored viewport might be off by a pixel. That tradeoff is worth it.

## Navigating to shapes

When navigating to a list of shape IDs, some shapes might not exist anymore. They could be deleted, or the link might be shared between documents. We handle this by grouping shapes by page and navigating to whichever page has the most matches:

```typescript
const byPage: { [pageId: string]: TLShape[] } = {}
for (const shape of allShapes) {
  const pageId = this.getAncestorPageId(shape)
  if (!pageId) continue
  byPage[pageId] ??= []
  byPage[pageId].push(shape)
}
const [pageId, shapes] = Object.entries(byPage).sort(
  ([_, a], [__, b]) => b.length - a.length
)[0] ?? ['', []]

if (!pageId || !shapes.length) {
  this._zoomToFitPageContentAt100Percent()
} else {
  this.setCurrentPage(pageId as TLPageId)
  const bounds = Box.Common(shapes.map((s) => this.getShapePageBounds(s)!))
  this.zoomToBounds(bounds, { immediate: true, targetZoom: this.getBaseZoom() })
}
```

If no shapes are found at all, we fall back to fitting the current page's content. The link degrades gracefully rather than breaking.

## Where this lives

Deep link encoding lives in `/packages/editor/src/lib/utils/deepLinks.ts`. The main editor methods are in `/packages/editor/src/lib/editor/Editor.ts`:

- `createDeepLink()` — Creates a URL with current viewport or selection
- `navigateToDeepLink()` — Parses a URL parameter and navigates to it
- `registerDeepLinkListener()` — Keeps the URL in sync with viewport changes

The listener uses a 500ms debounce to avoid thrashing browser history during pan and zoom. You can enable deep links on the editor with `<Tldraw deepLinks={true} />`.
