---
title: Why we don't cache browser canvas limits
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - browser
  - canvas
  - size
---

# Why we don't cache browser canvas limits

Probing canvas limits is expensive. We create up to 20 test canvases, draw pixels, read them back, and tear everything down. It takes measurable time. The obvious optimization: run the probe once, cache the result to localStorage, and skip the work on subsequent visits.

We don't do this. Here's why.

## The probe runs once anyway

Before explaining what we avoid, here's what we do: the probe results are cached in memory for the session. A module-level variable holds the limits after the first probe:

```typescript
let maxCanvasSizes: CanvasMaxSize | null = null

function getBrowserCanvasMaxSize(): CanvasMaxSize {
  if (!maxCanvasSizes) {
    maxCanvasSizes = {
      maxWidth: probeLimit('width'),
      maxHeight: probeLimit('height'),
      maxArea: probeLimit('area'),
    }
  }
  return maxCanvasSizes
}
```

One probe per browser tab, maximum. And most tabs never probe at all—we have a fast path that skips probing entirely when dimensions are under 8192×8192 with area under 16 megapixels. Normal exports stay under these limits.

So we're optimizing the rare case: someone exports a very large canvas, on a fresh page load, on a browser we haven't fingerprinted yet. That's already uncommon.

## The failure mode is invisible

The problem with localStorage caching is staleness. Browser canvas limits change between versions. Chrome 70 had a 32767 pixel limit; Chrome 83 raised it to 65535. A user who visited tldraw on Chrome 70, got their limits cached, then upgraded to Chrome 83 would still have the old limits stored.

Normally stale caches cause visible failures—a 404, a type error, something you can debug. Stale canvas limits cause invisible failures: the export produces a blank image, or a smaller image than expected, with no error anywhere.

Worse, the user can't easily clear the stale value. They'd have to know to open DevTools, navigate to Application > Local Storage, find our key, and delete it. For a bug they probably can't even identify ("my exports look weird").

## Browser limits aren't just version-dependent

Chrome's canvas limits also vary by system memory. A laptop with 4GB RAM might have different limits than one with 32GB. The same browser version, the same OS, different limits. Caching the limit from one machine wouldn't necessarily apply to the same user on a different machine.

We could incorporate the user agent and some system info into the cache key. But that adds complexity, and the system memory factor isn't reliably detectable from JavaScript anyway.

## The cost is acceptable

The probe itself is cheap enough that avoiding it isn't worth the risk. Creating a 65535×1 canvas takes microseconds. We test maybe a dozen sizes across three dimensions. The whole probe completes in under 50 milliseconds on any reasonable machine.

And it only happens when:
1. The user exports something very large (uncommon)
2. It's the first such export in this tab (once per session)
3. The fast-path safe limits don't apply (dimensions over 8192 or area over 16M pixels)

For most users, the probe never runs. For power users with giant canvases, it runs once and they never notice.

## When caching would make sense

There's a version of this where caching is reasonable: if the probe were slow (hundreds of milliseconds or more), if it ran on every export rather than once per session, or if the failure mode were recoverable (retry with fresh limits).

We hit none of those conditions. The probe is fast, it's already session-cached, and the failure mode—corrupt or missing exports—is unrecoverable once it happens.

Sometimes the right optimization is no optimization. The complexity of cache invalidation, the invisibility of the failure mode, and the rarity of the cold path all point the same direction: just probe when you need to, keep the result for the session, and throw it away on page reload.

## Key files

- `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` - Session caching at line 89-100
