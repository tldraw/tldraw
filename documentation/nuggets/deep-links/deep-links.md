---
title: Deep link encoding
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - deep
  - links
---

# Deep link encoding

You share a tldraw link with a colleague: `https://app.com?d=v342.178.1920.1080`. They click it, and their viewport jumps to exactly the right spot. Simple, right? Just serialize the viewport state and stick it in the URL.

Then someone tries to link to shapes with IDs containing dots. The URL breaks. The parser chokes. What looked like a straightforward encoding problem becomes a lesson in why human-readable URLs require more care than machine-readable ones.

## The double-encoding trap

URLs already have a standard encoding mechanism: `encodeURIComponent()`. It handles spaces, special characters, even emojis. But it has a quirk that breaks our approach.

Say you want to link to two shapes with IDs `abc` and `a.b.c`. The natural format is `sabc.a.b.c`, using dots as separators. But `encodeURIComponent()` doesn't escape dots—they're valid URL characters. So `encodeURIComponent('a.b.c')` returns `a.b.c` unchanged.

```typescript
const ids = ['abc', 'a.b.c']
const link = 's' + ids.map(encodeURIComponent).join('.')
// => 'sabc.a.b.c'

// Parse it back
const parsed = link.slice(1).split('.')
// => ['abc', 'a', 'b', 'c']  // Wrong! That's four IDs, not two.
```

The parser sees four dot-separated values when there should be two. The encoding is correct by URL standards, but it's ambiguous for our format.

The naive fix would be to pick a different separator—something guaranteed to be encoded, like spaces or commas. But then we lose readability. `sabc%20a%2Cb%2Cc` works but looks terrible. People copy-paste these URLs into Slack, inspect them in browser devtools, edit them by hand. Readability matters.

## Encoding the separator, not the content

The solution is counter-intuitive: double-encode. We call `encodeURIComponent()` first, then manually encode any remaining dots:

```typescript
function encodeId(str: string): string {
	return encodeURIComponent(str).replace(/\./g, '%2E')
}
```

Now `a.b.c` becomes `a%2Eb%2Ec`. The unencoded dots in the final string—`sabc.a%2Eb%2Ec`—are guaranteed to be separators, not content. The `%2E` sequences are guaranteed to be literal dots within IDs.

This lets us keep dots as separators while preventing ambiguity. The URLs remain readable: `v342.178.1920.1080` still looks like coordinates. Shape links like `sabc.def.ghi` are obvious even without documentation. But IDs with embedded dots work correctly.

Standard `decodeURIComponent()` handles the reverse. It sees `a%2Eb%2Ec` and returns `a.b.c`. No special decoding logic needed:

```typescript
const parts = 'sabc.a%2Eb%2Ec'.slice(1).split('.')
// => ['abc', 'a%2Eb%2Ec']

const ids = parts.map(decodeURIComponent)
// => ['abc', 'a.b.c']  // Correct!
```

## The percent-encoding rabbit hole

This approach has a subtle edge case. What if someone creates a shape with ID `a%2Eb`—literally containing the characters `%2E`?

```typescript
const id = 'a%2Eb'
const encoded = encodeId(id)
// encodeURIComponent('a%2Eb') => 'a%252Eb'
// Then replace dots: 'a%252Eb' (no change, no dots to replace)
// => 'a%252Eb'
```

The `%` gets encoded to `%25`, so we end up with `%252E`. Decoding reverses this correctly:

```typescript
decodeURIComponent('a%252Eb') // => 'a%2Eb'
```

The percent sign itself gets percent-encoded. This is exactly how URL encoding is supposed to work—it's self-consistent all the way down. You could have an ID that's `a%252Eb` (containing the literal string `%25`), and it would encode to `a%25252Eb`, decode correctly, and so on.

The system handles arbitrary nesting because we're using standard URL encoding, just with an extra pass for dots. Nothing clever, no special cases, just applying the same encoding twice to one specific character.

## Precision versus length

Viewport coordinates could be stored with full floating-point precision. The browser knows the camera is at `x: 342.7891234, y: 178.2341567`. Should we preserve all those decimals?

No. The difference between `342.789` and `343` is imperceptible on screen. Sub-pixel precision doesn't matter for positioning a viewport. So we round to integers:

```typescript
case 'viewport': {
  const { bounds, pageId } = deepLink
  let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
  // ...
}
```

This keeps URLs short. Compare `v342.7891234.178.2341567.1920.123456.1080.789012` (58 chars) with `v343.178.1920.1081` (18 chars). The shorter version is easier to read, takes less space in messages and browser chrome, and restores to a virtually identical viewport.

The tradeoff: if you zoom way in and share a link, when someone opens it, their viewport might be off by a pixel. For sharing a general area or a set of shapes, this is fine. If you need exact reproduction, you'd share the full document state through some other mechanism—not a URL.

## Navigation fallback

Deep links are fragile by design. They point to specific shapes by ID. Those shapes might not exist anymore. The page might have been deleted. What should happen when you follow a link to something that's gone?

When navigating to a shape link, the editor groups shapes by page and switches to the page with the most matches:

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

  if (!pageId || !shapes.length) {
    // Nothing found, show the current page
    this._zoomToFitPageContentAt100Percent()
  } else {
    this.setCurrentPage(pageId)
    const bounds = Box.Common(shapes.map((s) => this.getShapePageBounds(s)!))
    this.zoomToBounds(bounds, { immediate: true, targetZoom: this.getBaseZoom() })
  }
  return
}
```

If some shapes exist, zoom to those. If none exist, gracefully degrade to fitting the current page's content. This means old links keep working even as the document changes. They might not show exactly what they used to, but they don't error out or show a blank screen.

## URL length limits

Browsers technically support URLs up to 2,000 characters (IE) or much more (Chrome supports millions). But practical limits are lower. Servers often reject URLs over 2,048 characters. Users balk at copying 1,000-character monstrosities.

Our format is compact, but it's not magic. A link to 100 shapes with default IDs is about 290 characters. A link to 20 shapes with long custom IDs hits 900 characters. At some point, you hit a wall.

```bash
# 100 shapes with short IDs
s0.1.2.3.4...98.99
# ~290 characters

# 20 shapes with long IDs
svery-long-shape-id-with-lots-of-characters-0.very-long-shape-id...
# ~910 characters
```

We don't enforce a limit. If you try to link to 500 shapes, you'll get a 2,000-character URL that might work in your browser but break when pasted into Slack or sent through some proxies. This is a fundamental constraint of putting state in URLs.

The alternative would be to generate short tokens (like `?d=x7h9k2`) that map to stored viewport state on a server. That requires a server, a database, and handling token expiration. For a client-side library, putting state directly in the URL is simpler. You just accept the length constraints.

## The debounce pattern

Deep links work in both directions. When you pan or zoom, the URL can update to reflect your new viewport. But updating on every frame would thrash the browser history and be pointless—you don't want a "back" button that undoes every pixel of panning.

So we debounce. Changes accumulate for 500ms, then the URL updates once:

```typescript
editor.registerDeepLinkListener({
	debounceMs: 500,
	onChange(url, editor) {
		window.history.replaceState(null, '', url)
	},
})
```

This means the URL lags behind the actual viewport during interaction. While you're panning, the URL shows where you were half a second ago. Only when you stop does it catch up. The result: if you copy the URL mid-gesture, you'll get a link to almost—but not quite—where you are. Close enough.

The alternative would be no debounce, updating on every frame. This would murder performance (browser history operations are slow) and create confusion (the "back" button would step through thousands of viewport microstates). The lag is a feature.

## Human-readable is hard

The core tension in this system is between URL-safety and readability. Standard URL encoding solves the safety problem perfectly. But `?d=v%2D342%2E178%2E1920%2E1080` is unreadable gibberish.

We want `?d=v-342.178.1920.1080` because humans look at these URLs. They share them in messages, edit them by hand, recognize patterns. The choice to keep dots unencoded—and manually encode only the dots that cause ambiguity—is a design decision that trades some complexity for user experience.

This is the recurring pattern in tldraw: optimizing for humans, not just machines. The URLs could be shorter, more efficient, less ambiguous. But they'd be worse to use. Sometimes "worse is better" really means worse.

## Key files

- `/packages/editor/src/lib/utils/deepLinks.ts` - Encoding and decoding functions
- `/packages/editor/src/lib/editor/Editor.ts` - Navigation methods (`navigateToDeepLink`, `createDeepLink`, `registerDeepLinkListener`)
- `/packages/editor/src/lib/TldrawEditor.tsx` - Deep link prop handling on mount
