# Deep link encoding

Deep links let you share a URL that opens tldraw at a specific viewport position, with specific shapes visible, or on a specific page. The challenge is encoding all this information compactly—URLs have practical length limits, and every character costs readability. The naive approach would be to serialize the entire viewport state as JSON, but `?state=%7B%22x%22%3A100%2C%22y%22%3A200%7D` is neither compact nor human-readable.

## The format

Deep links encode three types of information: shape selections, viewport bounds, and page references. Each type uses a single-character prefix for unambiguous parsing:

```
sabc.def.ghi     - shapes: link to shapes abc, def, ghi
pabc123          - page: link to page abc123
v100.200.800.600 - viewport: x=100, y=200, width=800, height=600
v100.200.800.600.abc - viewport with page
```

The prefixes `s`, `p`, and `v` create prefix codes—the parser reads one character and knows exactly what structure follows. No delimiters or length fields needed.

Within each type, dots separate multiple values. A viewport link packs four numbers (x, y, width, height) and an optional page ID into a short string. Shape links can include any number of IDs. This gives us URLs like `?d=v-342.178.1920.1080` that humans can actually read and modify.

## The dot problem

IDs can contain any character, including dots. If someone creates a shape with ID `my.shape.with.dots`, encoding it as `smy.shape.with.dots` would be ambiguous—is that one shape or four?

The solution is to URL-encode dots within IDs:

```typescript
function encodeId(str: string): string {
  // need to encode dots because they are used as separators
  return encodeURIComponent(str).replace(/\./g, '%2E')
}
```

This encodes `my.shape.with.dots` as `my%2Eshape%2Ewith%2Edots`, keeping dots available as unambiguous separators. The decoding path uses standard `decodeURIComponent()` to restore the original IDs.

## Precision vs length

Viewport coordinates could have many decimal places, but that precision rarely matters. The difference between x=342.7891234 and x=343 is imperceptible on screen. So we round to integers:

```typescript
case 'viewport': {
  const { bounds, pageId } = deepLink
  let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
  // ...
}
```

This keeps viewport links short. A high-precision encoding might produce `v342.7891234.178.2341567.1920.123456.1080.789012`, while rounding gives `v343.178.1920.1081`. The extra precision buys nothing.

The tradeoff: rounding means the restored viewport won't be pixel-perfect. For most use cases—sharing a view with a colleague, bookmarking a region—this is fine. If someone needed exact reproduction, they'd share the full document state, not a viewport link.

## Navigation behavior

When a deep link is applied, the editor needs to figure out what to show. Page links are straightforward—switch to the page and fit content. Viewport links restore exact bounds. Shape links are trickier.

Shapes might be spread across multiple pages. The algorithm groups shapes by page and switches to the page containing the most shapes:

```typescript
case 'shapes': {
  const allShapes = compact(deepLink.shapeIds.map((id) => this.getShape(id)))
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
  // ...
}
```

If a link references shapes that no longer exist—deleted since the link was created—they're silently ignored. If none of the referenced shapes exist, the editor falls back to fitting page content at 100% zoom. This graceful degradation means old links don't break, they just show whatever's currently there.

## Continuous URL updates

Deep links work in both directions. The editor can listen to viewport changes and keep the URL in sync:

```typescript
editor.registerDeepLinkListener({
  debounceMs: 500,
  onChange(url, editor) {
    window.history.replaceState(null, '', url)
  }
})
```

The 500ms debounce prevents URL thrashing during pan/zoom operations. Only when the user stops moving does the URL update. This keeps the browser history clean while ensuring you can always copy the current URL and share it.

## Key files

- packages/editor/src/lib/utils/deepLinks.ts — Encoding and decoding functions
- packages/editor/src/lib/editor/Editor.ts — Navigation methods (`navigateToDeepLink`, `createDeepLink`, `registerDeepLinkListener`)
- packages/editor/src/lib/TldrawEditor.tsx — Deep link prop handling on mount
