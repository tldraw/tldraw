---
title: Microtask batching for font loading
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fonts
  - batching
  - microtasks
  - performance
---

# Microtask batching for font loading

When you create 100 text shapes at once, each shape needs to load its fonts. If each shape loads fonts independently, you get 100 separate font loading operations, 100 state updates, and 100 cascading re-renders. We batch all these requests into a single operation using `queueMicrotask`.

Here's how it works.

## The problem with immediate loading

When a shape component mounts, it calls `editor.fonts.requestFonts()` with the fonts it needs. The naive implementation would load each font immediately:

```typescript
requestFonts(fonts: TLFontFace[]) {
  for (const font of fonts) {
    this.ensureFontIsLoaded(font)
  }
}
```

If 100 shapes mount at once during React's commit phase, this runs 100 times in rapid succession. Each call:

1. Creates a font loading promise
2. Updates the font state atom
3. Triggers reactive computations
4. Schedules component re-renders

The problem isn't just the duplicate work—it's the cascading state updates. Each font load triggers a separate re-render pass. With 100 shapes, you get 100 render cycles when you only need one.

## Batching with microtasks

We defer font loading until all shape components have registered their requests:

```typescript
private fontsToLoad = new Set<TLFontFace>()

requestFonts(fonts: TLFontFace[]) {
  if (!this.fontsToLoad.size) {
    queueMicrotask(() => {
      if (this.editor.isDisposed) return
      const toLoad = this.fontsToLoad
      this.fontsToLoad = new Set()
      transact(() => {
        for (const font of toLoad) {
          this.ensureFontIsLoaded(font)
        }
      })
    })
  }
  for (const font of fonts) {
    this.fontsToLoad.add(font)
  }
}
```

The first shape to call `requestFonts` schedules a microtask. Subsequent shapes just add their fonts to the set. When the microtask runs, it processes all accumulated fonts in a single transaction.

## Why microtasks

The key is when the batched operation runs. JavaScript's event loop has multiple phases:

1. Synchronous code (current task)
2. Microtasks (`queueMicrotask`, Promise callbacks)
3. Rendering (layout, paint)
4. Macrotasks (`setTimeout`, I/O)

Microtasks run after all synchronous code completes but before the browser does anything else.

When React commits 100 shape components:

1. All 100 `useEffect` calls run synchronously
2. Each calls `requestFonts()` synchronously
3. First call schedules microtask, rest add to set
4. React commit phase completes
5. Microtask runs with all fonts
6. Single transaction batches all state updates
7. One re-render pass handles everything

This wouldn't work with `setTimeout(fn, 0)` because that's a macrotask—it runs too late, after React has already rendered. It wouldn't work with `requestAnimationFrame` either—that runs before the next paint, also too late.

## Set deduplication

Using a `Set` prevents duplicate font loads:

```typescript
for (const font of fonts) {
  this.fontsToLoad.add(font)
}
```

If 50 text shapes all use the same "Draw" font in normal weight, the set stores only one font descriptor. The loading operation runs once, not 50 times.

This deduplication happens at the descriptor level. Two fonts are the same if their family, weight, style, and URL match. The `Set` compares object references, but we construct font descriptors as shared objects, so shapes using identical fonts reference the same descriptor.

## Preventing re-entrancy

One subtle detail: we replace the set instead of clearing it:

```typescript
const toLoad = this.fontsToLoad
this.fontsToLoad = new Set()
for (const font of toLoad) {
  this.ensureFontIsLoaded(font)
}
```

If `ensureFontIsLoaded` triggers more `requestFonts` calls (maybe font loading causes shape updates), those new requests go into the new set, not the one we're currently iterating over. This prevents set mutation during iteration.

## Editor disposal check

The microtask includes a disposal check:

```typescript
queueMicrotask(() => {
  if (this.editor.isDisposed) return
  // ...
})
```

Between scheduling the microtask and it running, the editor might be disposed—for example, if the React component unmounts. Loading fonts on a disposed editor would error. The check bails out early.

## Transaction batching

All font loads happen inside a `transact()` call:

```typescript
transact(() => {
  for (const font of toLoad) {
    this.ensureFontIsLoaded(font)
  }
})
```

Each `ensureFontIsLoaded` call updates font state atoms. Without the transaction, each update would trigger immediate reactive notifications. The transaction collects all changes and notifies dependents once at the end.

This is the second level of batching—microtasks batch the requests, transactions batch the state updates.

## Where this lives

The batching implementation is in `FontManager.ts` at `/packages/editor/src/lib/editor/managers/FontManager/FontManager.ts` (lines 176-193).

Shape components trigger font requests in `Shape.tsx` at `/packages/editor/src/lib/components/Shape.tsx` (lines 46-51) using a reactive effect that re-runs when the shape's font requirements change.

The transaction system comes from `@tldraw/state` in `/packages/state/src/lib/transactions.ts`.

## When batching doesn't work

This batching assumes all font requests arrive synchronously. If shapes request fonts asynchronously—say, after an `await fetch()` call—each async request schedules its own microtask. The batching breaks down.

We avoid this by computing font requirements synchronously from shape props. Font descriptors are determined when the shape mounts, not loaded from the network.

## Performance characteristics

Without batching:

- 100 shapes → 100 font load operations
- 100 state update cycles
- 100 render passes
- Possibly duplicate font loads for common fonts

With batching:

- 100 shapes → 1 microtask
- Unique fonts identified (typically 4-8 variants for mixed text)
- 1 transaction with all state updates
- 1 render pass

The microtask itself has negligible cost. The win is consolidating state updates and eliminating duplicate work.
