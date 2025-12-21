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

When we added deep links to tldraw, we knew they'd break constantly. Shapes get deleted, pages disappear, documents change. A link that worked yesterday points to nothing today. The interesting problem isn't encoding viewport state in URLs—that's straightforward. The interesting problem is making links fail gracefully when the world they point to no longer exists.

## The fragility problem

Deep links are inherently brittle. You share a URL pointing to specific shapes, then someone deletes one. You bookmark a viewport location, then the page gets removed. You send a link with three shape IDs, and by the time someone clicks it, two of those shapes are gone.

We could treat these as errors—show an error message, redirect to a blank canvas, fail loudly. But that's hostile to the user. They clicked a link expecting to see something. If we can show them anything related to what they wanted, that's better than nothing.

## Navigation fallback logic

The navigation system handles three types of deep links: viewport locations, page references, and shape selections. Each has its own degradation strategy.

For viewport links, we restore the exact camera position if the page still exists. If the page is gone, we fall back to the current page and fit it to the viewport:

```typescript
case 'viewport': {
  if (deepLink.pageId) {
    const page = this.getPage(deepLink.pageId)
    if (page) {
      this.setCurrentPage(page)
    }
  }
  this.setCamera({
    x: -deepLink.bounds.x,
    y: -deepLink.bounds.y,
    z: deepLink.bounds.w / this.getViewportScreenBounds().w
  }, { immediate: true })
}
```

The page check matters. Without it, we'd restore the camera coordinates but show the wrong page's content. If the page doesn't exist, we skip `setCurrentPage` and the camera moves on whatever page is current. The user sees something rather than nothing.

Shape links are more interesting because they can partially fail. A link might reference five shapes, but only three still exist. We group the remaining shapes by page and navigate to whichever page has the most matches:

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
    this._zoomToFitPageContentAt100Percent()
  } else {
    this.setCurrentPage(pageId as TLPageId)
    const bounds = Box.Common(shapes.map((s) => this.getShapePageBounds(s)!))
    this.zoomToBounds(bounds, { immediate: true, targetZoom: this.getBaseZoom() })
  }
}
```

The `compact()` call filters out null results from `getShape(id)`. If a shape doesn't exist, we just skip it. The grouping-by-page logic handles cases where shapes were moved between pages or copied across multi-page documents. We show the page with the most surviving shapes.

If zero shapes exist, we fall back to fitting the current page content. The link still works—it just doesn't focus on anything specific because there's nothing left to focus on.

## URL sync debouncing

Deep links aren't just for sharing. We also update the URL as you navigate, so refreshing the page or copying the URL mid-session captures your current view. But panning and zooming fire constantly—potentially hundreds of events per second during a pinch gesture.

Updating the URL on every camera change would thrash the browser's history stack and make the back button useless. We debounce URL updates by 500ms:

```typescript
const scheduleEffect = debounce((execute: () => void) => execute(), opts?.debounceMs ?? 500)

const unlisten = react(
  'update url on state change',
  () => announceChange(new URL(url$.get()), this),
  { scheduleEffect }
)
```

The reactive computation tracks viewport changes automatically using tldraw's signals. When the viewport changes, the scheduled effect gets canceled and requeued. Only after 500ms of no changes does the URL actually update.

The tradeoff: the URL lags behind your actual position during interaction. If you pan quickly and immediately copy the URL, you might get coordinates from half a second ago. That's acceptable. The alternative—hundreds of history entries from one gesture—breaks basic browser functionality.

## Parsing error recovery

URL parsing can fail in several ways. The deep link string might be malformed, the type prefix might be invalid, or the URL parameter might be missing entirely. We catch these at the top level:

```typescript
try {
  this._navigateToDeepLink(parseDeepLinkString(deepLinkString))
} catch (e) {
  console.warn(e)
  this._zoomToFitPageContentAt100Percent()
}
```

Parse errors don't crash the app. They log a warning and fall back to showing the current page content. A broken link is annoying but shouldn't break the experience.

The parsing itself is permissive. Viewport coordinates use `Number()` to convert strings, which returns `NaN` for garbage input. Camera operations handle `NaN` gracefully—they clamp to valid values rather than exploding. We could validate more strictly, but there's little benefit. Bogus coordinates just position the camera somewhere wrong, and the user can pan to fix it.

## Precision vs URL length

Viewport coordinates are rounded to integers before encoding:

```typescript
let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
```

Sub-pixel precision doesn't matter for viewport positioning. Rounding `v342.7891234.178.2341567.1920.123456.1080.789012` to `v343.178.1920.1081` saves 40 characters with no perceptible difference on screen. The viewport might be off by one pixel when restored. That's fine.

This matters because URL length is limited. IE supported ~2,000 characters. Modern browsers handle millions technically, but servers often reject URLs over 2,048 characters. Short viewport strings leave room for shape IDs in multi-part links.

## Where this lives

Deep link encoding lives in `/packages/editor/src/lib/utils/deepLinks.ts`. The navigation logic is in `/packages/editor/src/lib/editor/Editor.ts` across several methods: `_navigateToDeepLink` (core routing), `navigateToDeepLink` (entry point with error handling), `createDeepLink` (encoding from current state), and `registerDeepLinkListener` (reactive URL sync).

The `TldrawEditor` component in `/packages/editor/src/lib/TldrawEditor.tsx` wires it together, handling the `deepLinks` prop and registering the listener on mount.

## The degradation strategy

Deep links work because they're designed to fail gracefully at every level. Missing shapes don't error—they're filtered out. Missing pages don't crash—they fall back to the current page. Parsing errors don't break—they show page content. The system assumes links will become stale and handles it.

This is more work than treating broken links as errors. But it's the difference between a feature that's useful in practice and one that works perfectly in demos and breaks constantly in production. Real links go stale. The code accepts that.
