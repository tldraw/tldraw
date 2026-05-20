# Editor manager modularity audit (v2)

A review of each manager under `packages/editor/src/lib/editor/managers/` (plus `OverlayManager`), graded for how easily it can be tested, reused, and refactored in isolation from the rest of `Editor`. The goal is to identify "under the hood" refactors that improve isolation **without changing `Editor`'s public API**.

This v2 was produced by 16 parallel per-manager audits and synthesized here. Several findings go beyond modularity into latent correctness, perf, or layering issues — those are called out per-section and collected in [Latent issues uncovered](#latent-issues-uncovered-during-audit).

The scoring rubric:

- **A** — no `Editor` dependency, or a tiny well-defined one. Drop-in testable, swappable.
- **B** — depends on a small, well-bounded slice of `Editor` that could be modeled as a narrow port without much rewriting.
- **C** — depends on a wide cross-section of `Editor` (10+ different methods, mixed responsibilities). Testable today via `TestEditor`, but not easily reusable.
- **D** — knows about and writes back into editor state (`updateInstanceState`, `dispatch`) and/or owns side-effecting subscriptions tangled with editor lifecycle.
- **F** — cyclic or hidden coupling; cannot be exercised without standing up most of `Editor`.

No manager scores below C+, so the practical band is A through C+. The exercise is about _raising_ the floor.

## Summary table

| Manager                              | Lines | Grade  | Headline issue (deepened by v2 audit)                                                                                       |
| ------------------------------------ | ----: | :----: | --------------------------------------------------------------------------------------------------------------------------- |
| `HistoryManager`                     |   402 | **A**  | Already DI'd via `{ store, annotateError }`. Production model.                                                              |
| `UserPreferencesManager`             |   145 | **A**  | No editor dep. But `systemColorScheme` atom key collides across instances — real test-isolation hazard.                     |
| `ThemeManager`                       |   116 | **A−** | Single `editor.user.getIsDarkMode()` call. `defaultThemes.ts` movable to `tlschema` today (imports nothing else).           |
| `TextManager`                        |   441 | **A−** | Only needs `container` + `document`. DOM pool never shrinks below high-water mark.                                          |
| `CollaboratorsManager`               |    98 | **B+** | Helpers pull **three** editor surfaces (options, instance state, user id), not one. Interval clock started unconditionally. |
| `OverlayManager`                     |  ~120 | **B**  | `OverlayUtil` is `@public` — port narrowing is a breaking change. No `dispose()`. `_geometryCache` WeakMap can leak.        |
| `PerformanceManager`                 |   583 | **B**  | Subscriber, but with **six reverse-coupling `_notify*` call sites** in Editor.ts and StateNode.ts.                          |
| `TickManager`                        |    56 | **B**  | 56 lines, but its `'tick'`/`'frame'` events fan out to **8 other call sites** across the editor.                            |
| `SpatialIndexManager`                |   359 | **B−** | The "check remaining shapes" loop is **O(n) every diff**, not O(log n). Bounds-cache reactivity is implicit.                |
| `FontManager`                        |   189 | **B−** | No `dispose()`. `document.fonts` scanned O(n) per shape load.                                                               |
| `ClickManager`                       |   223 | **B−** | `lastPointerInfo` mutable + spread in async closures → race. `overflow` state has no exit transition.                       |
| `FocusManager`                       |    94 | **C+** | **Layering violation:** `editor.isIn('select.editing_shape')` references a tool path that lives in `packages/tldraw`.       |
| `EdgeScrollManager`                  |   131 | **C+** | 9 editor surfaces. Called only from three tool `onTick` handlers; pure-function refactor is unlocked.                       |
| `SnapManager` (+ Bounds/HandleSnaps) |  1666 | **C+** | **15 editor methods, no state writes** — geometry helpers are already mostly pure under the hood.                           |
| `InputsManager`                      |   578 | **C**  | State holder bleeds into the store (`TLPOINTER_ID` writes + collaborator check).                                            |
| `ScribbleManager`                    |   570 | **C**  | Per-frame writes routed through `editor.run()` — may pollute undo/redo with animation frames.                               |

> Note: large line count alone is not a modularity problem — `HistoryManager` is 400+ lines and scores A. The grade reflects coupling shape, not size.

## Per-manager assessments

### `HistoryManager` — A

**Why it grades well.** Only manager already constructor-injected (`{ store, annotateError }`), generic over `R extends UnknownRecord`. Zero `Editor` reference, no hidden coupling — all imports are leaf (`@tldraw/state`, `@tldraw/store`, `@tldraw/utils`). Tests exercise it against a bare `Store`.

**Follow-on work.**

1. The inline `Stack<T>`/`StackItem<T>`/`EmptyStackItem<T>` (lines 360–390) is a reusable immutable linked list. If anything else in the codebase grows a similar undo/redo or session-ordering pattern, promote it to `@tldraw/utils` as `ImmutableStack<T>`. Otherwise leave inline.
2. The `_isInBatch` flag at HistoryManager.ts:83 is `@internal` and load-bearing — it coalesces nested `transact()`s. Worth a one-line comment explaining the re-entrancy guarantee for future readers.

**Suggested port.** Already complete:

```ts
interface HistoryManagerDeps<R extends UnknownRecord> {
	store: Store<R>
	annotateError?(error: unknown): void
}
```

---

### `UserPreferencesManager` — A

**Why it grades well.** Constructor takes `(user: TLCurrentUser, colorScheme)`. Only DOM touchpoint is `getGlobalWindow().matchMedia` (UserPreferencesManager.ts:17–32), a leaf dependency.

**Follow-on work.**

1. Inject a `MediaQueryPort` so the prefers-color-scheme listener is fakeable without globally mocking `window.matchMedia`.
2. Hide `disposables: Set<() => void>` (line 9); expose only `dispose()`. Tests currently manipulate the set directly.
3. Compact lines 59–143 — 10 nearly-identical `@computed` getters around `user.userPreferences.get()` + default. A single computed `preferences$` object would halve the file.
4. (Correction from v1) — no `@deprecated` getter aliases exist here; that observation belongs to `InputsManager`.

**New hazard from audit.** `systemColorScheme = atom<'dark'|'light'>('systemColorScheme', 'light')` (line 8) is constructed per-instance but **shares an atom name across instances**. Two `UserPreferencesManager` instances in the same process bleed state through name collision. This bites in tests that create multiple editors and in any future SSR/hydration scenario. Generate a unique atom name per instance, or hoist `systemColorScheme` to a single module-level signal.

**Suggested port.**

```ts
interface MediaQueryPort {
	matchMedia(query: string): MediaQueryList | null
}
```

---

### `ThemeManager` — A−

**Why it grades well.** One editor call: `editor.user.getIsDarkMode()` at ThemeManager.ts:50. All theme state in private atoms. Clean `dispose()`.

**Follow-on work.**

1. Replace `editor` constructor param with `colorMode$: Computed<'light' | 'dark'>`. Editor wraps `this.user.getIsDarkMode` and passes it in.
2. **Move `defaultThemes.ts` to `@tldraw/tlschema`** — its only imports are from `tlschema` already (`DefaultFontFamilies`, `TLDefaultColor`, `TLDefaultColorStyle`, `TLTheme`, `TLThemeColors`). No blocker. Eliminates the editor's re-export chain for default themes.
3. `resolveThemes` (lines 15–17) is a public helper. After step 2, `Editor` imports both `ThemeManager` and `resolveThemes` from a thinner surface — net simpler.

**Suggested port.**

```ts
interface ThemeManagerDeps {
	themes: TLThemes
	initial: TLThemeId
	colorMode$: Computed<'light' | 'dark'>
}
```

---

### `TextManager` — A−

**Why it grades well.** Only editor calls are `getContainer()` and `getContainerDocument()` (lines 97, 101, 177, 183, 233). All other touchpoints (`Range`, `getBoundingClientRect`, `innerHTML`, `Node.TEXT_NODE`) are leaf DOM APIs.

**Follow-on work.**

1. Adopt the `ContainerHost` port (`getContainer`, `getDocument`) — shared with `FocusManager` and `FontManager`.
2. Extract `normalizeTextForDom` (lines 7–13) and `textAlignmentsForLtr` (lines 15–22) to a `text/utils.ts` for direct unit coverage.
3. **Don't make `measureElementTextNodeSpans` static** — despite no `this` references, it relies on `element.childNodes[0]` being the root text node, an implicit contract with its caller. Keep it as an instance method and document the assumption.

**New hazard.** The measurement pool (`poolElms`) shrinks to the most recent batch size (lines 194–196) but never below it. Variable-batch usage accumulates DOM nodes until `dispose()`. Low-priority, but a high-water-mark trim (e.g. shrink to 80% of peak) would help long-running sessions.

**Suggested port.**

```ts
interface ContainerHost {
	getContainer(): HTMLElement
	getDocument(): Document
}
```

---

### `CollaboratorsManager` — B+

**Why this grade.** Read-only over the store via `store.query`. Helpers in `utils/collaboratorState.ts` re-take the editor.

**Coupling widened in v2.** The helpers pull **three** editor surfaces, not one:

- `editor.options.collaboratorInactiveTimeoutMs` / `collaboratorIdleTimeoutMs` (collaboratorState.ts:18–20) — config.
- `editor.getInstanceState()` (collaboratorState.ts:39) — read **inside the filter predicate**, so it runs once per collaborator per re-evaluation. For 100 peers, that's 100 instance-state reads.
- `editor.user.getId()` (collaboratorState.ts:47) — user identity.

**New hazard.** `editor.timers.setInterval(...)` in the constructor (lines 23–25) runs **unconditionally**, even with no subscribers. Violates the lazy-attach pattern that `PerformanceManager` already uses.

**Follow-on work.**

1. Narrow the helpers to take only what they need: a `now`, the relevant options, current user id, instance-state slice. Stop passing `editor` through them.
2. Make the visibility clock lazy — attach the interval only when `getVisibleCollaborators` has an observer.
3. Hoist `getInstanceState()` read out of the per-collaborator predicate; capture once per re-evaluation.
4. Inject `(store, currentUserId, currentPageId$, options, scheduler)` instead of editor.

**Suggested port.**

```ts
interface CollaboratorDeps {
	store: TLStore
	userId: TLUserId
	currentPageId$: Computed<TLPageId>
	options: Pick<
		TldrawOptions,
		'collaboratorCheckIntervalMs' | 'collaboratorIdleTimeoutMs' | 'collaboratorInactiveTimeoutMs'
	>
	visibility: {
		followingUserId(): TLUserId | null
		highlightedUserIds(): TLUserId[]
	}
	scheduler: { setInterval(fn: () => void, ms: number): () => void }
}
```

**Surprising finding.** Line 49: `[...new Set(allPresenceRecords.map(c => c.userId))].sort()`. The sort is stable on string IDs, so cursor ordering is deterministic per snapshot — but it changes whenever a peer joins or leaves. Not a bug, but worth a comment so a future "optimize this" PR doesn't drop the sort.

---

### `OverlayManager` — B

**Why this grade.** Plugin-host pattern is clean (registry + iteration). Coupling comes entirely from passing `editor` raw to every `OverlayUtil` instance (Editor.ts:507). Built-in overlays (e.g., `ShapeIndicatorOverlayUtil`) demonstrate the sprawl — 9+ distinct editor calls each.

**Constraint discovered.** `TLOverlayUtilConstructor` is `@public` and **`apps/examples` already ships custom overlays** (DimensionsHud, PointerRing, etc.) using `new (editor: Editor)`. Narrowing the constructor signature is a major-version-breaking API change.

**New hazards.**

1. **No `dispose()`** on `OverlayManager` or `OverlayUtil`. Subscriptions/timers/listeners held by overlays leak across editor lifecycles.
2. **`_geometryCache: WeakMap<TLOverlay, Geometry2d>`** (OverlayManager.ts:116) relies on overlay object identity. If `getOverlays()` returns fresh instances each frame, entries don't evict and the map grows.

**Follow-on work.**

1. Add `dispose()` to both classes and call it from `OverlayManager.dispose()`.
2. Verify (with a test) that `_geometryCache` evicts under realistic overlay churn — a single-frame collaborator-cursor overlay implementation should not blow the cache.
3. _Long term_ (major version): introduce `OverlayContext`. Same problem and same shape as `ShapeUtil`/`BindingUtil`/`AssetUtil` and is best tackled together as a family migration.

**Suggested port (for the major-version-bump path).**

```ts
interface OverlayContext {
	getInstanceState(): TLInstancePageState
	getRenderingShapes(): TLShape[]
	getHintingShapeIds(): TLShapeId[]
	getZoomLevel(): number
	getCurrentTheme(): TLDefaultTheme
	getColorMode(): 'light' | 'dark'
	getSelectedShapeIds(): TLShapeId[]
	getHoveredShapeId(): TLShapeId | null
	isInAny(...states: string[]): boolean
	getShape(id: TLShapeId): TLShape | undefined
	getShapePageTransform(s: TLShape): Mat | undefined
	getShapeUtil(s: TLShape): ShapeUtil<TLShape>
}
```

---

### `PerformanceManager` — B

**Why this grade.** Output side is clean (lazy `EventEmitter`). Input side pulls wide editor surface at emit-time: camera, shape counts, viewport, culled shapes, selected shapes.

**Reverse coupling found in v2.** The manager is invoked by **six call sites outside it**, which the v1 framing of "subscriber-only" missed:

- `StateNode.ts:188, 208` — `enter()`/`exit()` call `editor.performance._notifyInteractionStart/End` directly.
- `Editor.ts:1466, 1497` — `undo()`/`redo()` call `_notifyUndoRedo`.
- `Editor.ts:10985, 11078, 11089, 11210` — camera gestures call `_notifyCameraOperation`.

All six pass through underscored "internal" methods, but they're hard-wired call sites; you can't unplug the manager without editing all of them.

**Follow-on work.**

1. Define a `PerfDataSource` port for the read surface used at emit time.
2. Hoist the LoAF observer into a small `LoafObserver` utility — currently a static block inside the class.
3. Coalesce the four duplicated `*Cleanup` fields (lines 100–103) into a single subscription helper / `Disposer` set.
4. **Keep `PerformanceApiAdapter` separate** — it's a tree-shakeable decorator that pipes events into `performance.mark()`. Folding it in would drag platform code into the base manager.
5. Replace the six raw `_notify*` call sites with a thin internal event bus (`'editor:interaction-start'`, etc.) that `PerformanceManager` subscribes to. The notification surface becomes uniform instead of six hand-written calls.

**Surprising finding.** `_notifyInteractionStart` captures `selectedShapeTypes` (lines 193–198) but never exposes it in the emitted `TLInteractionStartPerfEvent` (lines 208–213). Either thread it through to the event payload or delete the capture — currently wasted work on every interaction start.

**Suggested port.**

```ts
interface PerfDataSource {
	getSelectedShapes(): TLShape[]
	getCurrentPageShapeIds(): Set<TLShapeId>
	getCulledShapes(): Set<TLShapeId>
	getCamera(): { x: number; y: number; z: number }
	getViewportScreenBounds(): { w: number; h: number }
}
```

---

### `TickManager` — B

**Why this grade.** 56 lines, but it knows about two unrelated peers: it pokes `editor.inputs.updatePointerVelocity` directly and emits `'frame'`/`'tick'` on the editor bus. Both should be injected.

**Fanout discovered.** The two events drive **8 downstream consumers**:

- `'frame'` → `PerformanceManager._onFrame` (PerformanceManager.ts:506).
- `'tick'` → five Editor.ts listeners: `_flushEventsForTick` (line 900), `_animateViewport` (3976), `moveCamera` (4037), `_decayCameraStateTimeout` (4692), `handleTick` (8741) — plus `editor.inputs.updatePointerVelocity` via the direct call.

That's the real coupling: any refactor here touches eight files.

**Follow-on work.**

1. Constructor becomes `new TickManager({ raf, caf, now, onTick })`. `Editor` supplies `onTick`. Remove the `process.env.NODE_ENV === 'test'` branch (lines 4–13) — inject `raf` instead.
2. **Demote `updatePointerVelocity` from privileged call to ordinary frame listener.** Today it's hard-coded inside `tick()`. If it's a frame listener like everyone else, `InputsManager` subscribes once in its constructor and `TickManager` doesn't know about it. Symmetric, testable.
3. Make `TickManager` itself the production implementation of the `Scheduler` port (see [Pattern 5](#5-a-typed-scheduler-port)).

**Root cause of the React-strict-mode camera bug (Editor.ts:411–416).** The "reset camera state on dispose" workaround papers over a deeper issue: `'tick'` listeners are added by Editor _after_ `TickManager` starts, but `TickManager.dispose` doesn't track or remove those listeners — they're owned by the `EventEmitter` superclass. On double-mount, the listeners can re-bind to a stale closure scope. Fixing this properly means letting `TickManager` own the listener registry, not just the RAF loop.

**Suggested port.**

```ts
interface TickPort {
	onTick(cb: (elapsedMs: number) => void): () => void
	raf(cb: FrameRequestCallback): number
	caf(id: number): void
	now(): number
}
```

---

### `SpatialIndexManager` — B−

**Why this grade.** `RBushIndex` is a clean data structure. The manager around it taps five editor surfaces + `store.query.filterHistory`.

**v2 deepens both concerns.**

1. **Reactive dependency is implicit, not explicit.** The `spatialIndexComputed` (line 28) doesn't directly depend on any bounds signal; it relies on incidental capture when `getShapePageBounds` reads `_getShapePageBoundsCache` during the diff loop. If a bounds invalidation ever happens _outside_ the shape-record-diff cycle (e.g. a layout-only recompute), the index will go stale. This is reactivity debt: the manager's freshness rides on a side effect of cache reads.
2. **The "check remaining shapes" loop is O(n) per diff** (lines 141–154). For every shape mutation, the manager walks **every shape currently in the index** to compare its current bounds against indexed bounds — to catch arrows whose anchors moved and groups whose children moved. This defeats the O(log n) promise of the data structure for large pages. The diff _should_ contain the dependent shapes (arrows update when bound shapes update), so this loop is either insurance against a missing dependency or evidence that the diff is incomplete.

**Follow-on work.**

1. Define a `ShapeBoundsSource` port (below). Editor implements it; tests stub it.
2. Extract `processIncrementalUpdate` as a pure function operating on diffs + a `BoundsAccessor`. Direct unit coverage of the diff/bounds reconciliation.
3. **Investigate the O(n) loop.** Either prove the diff really is incomplete and document why, or remove the loop and add tests that exercise the arrow/group-follow case.
4. Make the bounds dependency explicit — subscribe `spatialIndexComputed` to the bounds cache rather than relying on capture.

**Suggested port.**

```ts
interface ShapeBoundsSource {
	currentPageId(): TLPageId
	getCurrentPageShapes(): TLShape[]
	getShapePageBounds(id: TLShapeId): Box | undefined
	getAncestorPageId(shape: TLShape): TLPageId | null
	shapeHistory: {
		getDiffSince(epoch: number): RecordsDiff<TLRecord>[] | typeof RESET_VALUE
	}
}
```

---

### `FontManager` — B−

**Why this grade.** Three distinct collaborators: store caches, `getShapeUtil`, `document.fonts`.

**New hazards from audit.**

1. **No `dispose()`**. `fontStates: AtomMap<TLFontFace, FontState>` (line 81), `fontsToLoad: Set<TLFontFace>` (line 110), and the two store caches are never cleared. Test suites that recreate the editor accumulate state across runs.
2. **O(n) FontFaceSet scan per font load**: `findOrCreateFontFace` (lines 129–151) iterates `document.fonts` linearly for every shape font request, matching descriptors. With many fonts loaded, this becomes a render-loop hotspot. Maintain a `Map<FontKey, FontFace>` locally and reconcile lazily.
3. **No backpressure on `loadRequiredFontsForCurrentPage`**. The `limit` parameter is the only guard; rapid page navigation can re-walk all shapes.

**Follow-on work.**

1. Add `dispose()` — clear `fontStates`, `fontsToLoad`, both store caches.
2. Cache `FontFace` lookups locally; do not scan `document.fonts` on the hot path.
3. Split into `FontRegistry` (pure: `Document` + `FontFace` lifecycle) and `ShapeFontTracker` (reactive: shape iteration via `ShapeUtil.getFontFaces`). `FontManager` becomes a façade.
4. Use the `ContainerHost` port.

**Suggested port.**

```ts
interface FontManagerDeps {
	store: TLStore
	containerDoc: { fonts: FontFaceSet }
	getShapeUtil(s: TLShape): { getFontFaces(s: TLShape): TLFontFace[] }
	isDisposed(): boolean
}
```

---

### `ClickManager` — B−

**Why this grade.** State machine is self-contained but the manager calls `editor.dispatch(...)` to synthesize click events back into the input pipeline, and reaches `editor.timers`, `editor.options`, `editor.inputs.getCurrentScreenPoint`, and `editor.getInstanceState().isCoarsePointer`.

**New hazards.**

1. **Race on `lastPointerInfo`**: `lastPointerInfo` is public mutable (line 95). It's overwritten on each `pointer_down` (line 112) and spread into events that fire inside async `setTimeout` settle callbacks (lines 38, 47, 56). If a new `pointer_down` lands between when a timeout was scheduled and when it fires, the settle event carries the _new_ click's data. Subtle, but real at high input rates (stylus, multi-touch).
2. **`overflow` state has no exit**: Once `_clickState === 'overflow'`, the only `pointer_down` branch (lines 149–154) keeps it in `overflow`. There's no path back to `idle` other than `cancelDoubleClickTimeout()`. A user mashing the mouse can wedge the state machine. Tests at ClickManager.test.ts:192–203 cover entry into overflow but not exit. Add a `reset()` and/or a transition back to `pendingDouble` after `multiClickDurationMs`.

**Follow-on work.**

1. Constructor takes `{ dispatch, timers, options, getCoarsePointer, getCurrentScreenPoint }`. State machine becomes a pure transducer.
2. Capture a copy of `lastPointerInfo` _into the timeout closure_ rather than reading the latest at fire time. Eliminates the race.
3. Add a property-style test driving sequences of `pointer_down`/`pointer_up`/`pointer_move` through every state, asserting reachability.

**Suggested port.**

```ts
interface ClickManagerDeps {
	dispatch(event: TLClickEventInfo): void
	timers: { setTimeout(fn: () => void, ms: number): unknown }
	options: { doubleClickDurationMs: number; multiClickDurationMs: number }
	getCoarsePointer(): boolean
	getCurrentScreenPoint(): Vec
}
```

---

### `FocusManager` — C+

**Why this grade.** DOM coupling + editor state writes + reaches into `editor.complete()` (a tool-state-machine operation) on blur.

**Layering violation found.** FocusManager.ts:66 reads `this.editor.isIn('select.editing_shape')`. The state path `'select.editing_shape'` is **defined in `packages/tldraw`** (`packages/tldraw/src/lib/tools/SelectTool/childStates/EditingShape.ts`), but `FocusManager` lives in `packages/editor`. This is an upward dependency from the editor package on the tldraw package's tool tree, currently held together only by the string. Swap the select tool, or rename the child state, and the focus-ring suppression breaks silently.

**Asymmetric blur path.** `editor.blur({ blurContainer: true })` calls `focusManager.blur()` (which calls `editor.complete()` then blurs). `editor.blur({ blurContainer: false })` calls `editor.complete()` itself, bypassing the manager. The manager doesn't know about the second path. Centralize the contract.

**Follow-on work.**

1. Decompose into `FocusController` (focus state, no DOM) + `FocusDom` (CSS classes, body listeners).
2. Inject `isEditingShape: () => boolean` and `onBlur: () => void` — kill the layering violation and the tool-state dependency.
3. Lazy-attach body listeners only when focused (today they're always on).
4. Use the `ContainerHost` port.

**Suggested port.**

```ts
interface FocusDeps {
	container: HTMLElement
	document: Document
	isEditingShape(): boolean
	onBlur(): void
}
```

---

### `EdgeScrollManager` — C+

**Why this grade.** Nine editor surfaces in 131 lines. Behavior is stateless math driving one side effect (move camera).

**Call pattern confirmed.** Not always-on — `updateEdgeScrolling` is called from exactly three tool `onTick` handlers: `Resizing.onTick`, `Brushing.onTick`, `Translating.onTick`. Each tool guards on `isDragging` + `isPanning`. The dependency direction is sensible (tools opt in to edge scrolling during drag states), so the manager doesn't need to know about tool state — only execute math when invoked.

**Follow-on work.**

1. Refactor as a pure step function `computeEdgeScrollDelta(inputs, elapsed, durationSoFar): Vec | null` over an explicit input bag.
2. Manager becomes a thin loop that accumulates duration and calls `editor.setCamera`.
3. Promote the `0.612` small-screen factor to a named constant (`SMALL_SCREEN_SPEED_FACTOR`) and document the source — it appears hand-tuned for mobile/tablet UX with no provenance.
4. Resolve the asymmetric `edgeScrollEaseDuration > 0` branch (line 41) — either always pass the duration or always ease.

**Suggested input bag.**

```ts
interface EdgeScrollInputs {
	screenPoint: { x: number; y: number }
	screenBounds: { w: number; h: number }
	isCoarsePointer: boolean
	insets: [top: boolean, right: boolean, bottom: boolean, left: boolean]
	zoom: number
	camera: { x: number; y: number; z: number }
	cameraIsLocked: boolean
	userEdgeScrollSpeed: number
	options: Pick<
		TldrawOptions,
		| 'edgeScrollDelay'
		| 'edgeScrollDistance'
		| 'edgeScrollSpeed'
		| 'edgeScrollEaseDuration'
		| 'coarsePointerWidth'
	>
}
```

---

### `SnapManager` (+ `BoundsSnaps`, `HandleSnaps`) — C+

**Why this grade.** Largest manager: 1666 lines across three files.

**v2 corrections.** The actual editor surface is **15 methods**, not 11 — missed last round: `getShapePageTransform`, `getPointInShapeSpace`, `getShapeGeometry`. **No state writes anywhere** — all calls are reads/queries.

**Better-than-feared internal structure.** `BoundsSnaps`'s private methods (`collectPointSnaps`, `collectGapSnaps`, `getPointSnapLines`, `getGapSnapLines`) are pure given their inputs — they accumulate into arrays in place. Only the `@computed` getters touch the editor. So most of the 1270-line file is _already_ extractable as standalone math; the editor coupling is concentrated in a few choke points.

`BoundsSnaps` and `HandleSnaps` are **siblings**, not nested — they don't call each other; both hold a `manager` ref. Each has its own `@computed` caches. Both subclasses also redundantly stash `this.editor = manager.editor`, which is a small smell.

**TODO comment correction.** "Make this an incremental derivation" on `getSnappableShapes` is _not_ a real perf issue today — the function is `@computed` and only re-runs on selection change. Don't prioritize it.

**Follow-on work.**

1. Define `SnapEditorPort` (below). Editor implements it. Manager + subclasses take the port.
2. Add a `SnappableShapeSource` adapter that yields `{ id, bounds, canSnap, isFrameLike, isGroup }` so the recursive `collectSnappableShapesFromParent` no longer needs `getShapeUtil` or shape-type knowledge.
3. Drop the redundant `this.editor` stash in `BoundsSnaps`/`HandleSnaps`.
4. _Optional, lower priority:_ split `BoundsSnaps.ts` into `gaps.ts` + `points.ts` + `align.ts` for navigability.

**Suggested port.**

```ts
interface SnapEditorPort {
	getZoomLevel(): number
	getViewportPageBounds(): Box
	getSelectedShapeIds(): TLShapeId[]
	getSelectedShapes(): TLShape[]
	getShape(id: TLShapeId): TLShape | undefined
	getShapePageBounds(id: TLShapeId): Box | undefined
	getShapePageTransform(id: TLShapeId): Mat | undefined
	getPointInShapeSpace(id: TLShapeId, pt: Vec): Vec
	getShapeUtil(s: TLShape): ShapeUtil<TLShape>
	getShapeGeometry(s: TLShape): Geometry2d
	isShapeFrameLike(s: TLShape): boolean
	isShapeOfType(s: TLShape, type: string): boolean
	getSortedChildIdsForParent(id: TLParentId): TLShapeId[]
	findCommonAncestor(shapes: TLShape[]): TLParentId | undefined
	getCurrentPageId(): TLPageId
	options: Pick<TldrawOptions, 'snapThreshold'>
}
```

---

### `InputsManager` — C

**Why this grade.** Mostly a state holder (atoms + getters), but two outbound dependencies break the pure-state-holder contract:

- `updateFromEvent` writes a presence record (`TLPOINTER_ID`) into the store via `editor.store.put(...)` inside `editor.run({ history: 'ignore' })` (lines 528–551). Peer-manager side effect.
- `_getHasCollaborators` (line 450) calls `editor.getCollaborators().length > 0` inside a `@computed`. InputsManager now knows about CollaboratorsManager. The code comment even asks "could we do this more efficiently?" — flagging itself.

**`__unsafe__getWithoutCapture` is fine.** The three uses (lines 495–497, 524–525, 531) snapshot state within a single synchronous handler to prevent cascading subscriptions. Sound by design.

**`toJson()` is production code, not debug.** Used in `createErrorAnnotations` to log input state on crashes. Keep it public.

**Follow-on work.**

1. Extract a `PointerPresenceBridge` that subscribes to input atoms and writes `TLPOINTER_ID`. Move `_getHasCollaborators` there. `InputsManager` becomes a pure observable state holder.
2. Codegen the 10+ atom/getter/deprecated-getter/setter quadruples from a small descriptor table. ~300 lines disappear.
3. Inject `camera$` and `screenBounds$` as signals instead of reading via `editor.getCamera()` / `editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)`.
4. Delete the `@deprecated get foo()` aliases at the next major (already migrated internally).

**Magic constant flagged.** Line 477: `pointerVelocity.lrp(direction.mul(length / elapsed), 0.5)`. The 0.5 smoothing is frame-rate-independent in name only — at high refresh rates the EMA decays differently than at 60 Hz. Worth a comment, or better, a tuned coefficient.

**Suggested port.**

```ts
interface InputsDeps {
	camera$: Computed<{ x: number; y: number; z: number }>
	screenBounds$: Computed<Box>
	hasCollaborators$: Computed<boolean>
	store: {
		put(records: TLRecord[]): void
		unsafeGetWithoutCapture(id: string): TLRecord | undefined
	}
	run(fn: () => void, opts?: { history?: 'ignore' | 'record' }): void
}
```

---

### `ScribbleManager` — C

**Why this grade.** Owns scribble state in a private `Map<string, Session>` but writes through `editor.updateInstanceState({ scribbles })` every tick. That coupling means you cannot exercise the simulation without a real `Editor`. Reaches `editor.options.laserFadeoutMs`, `editor.timers.setTimeout`, `editor.run`, `editor.getInstanceState().scribbles`, and `editor.updateInstanceState`.

**Latent correctness concern.** `editor.run()` (Editor.ts:1631–1641) routes through `history.batch()`. Scribble ticks are therefore wrapped in a history batch. If scribbles are intended to be ephemeral (laser highlights, eraser marks), tick updates may end up reflected through history mechanics — at minimum they're inside batched-effect semantics they don't need. Either the tick should not use `run()`, or `scribbles$` should be exposed as a pure signal and applied to instance state by a side-effect sink that runs _outside_ history batching.

**Simple-API perf smell.** `addPoint(id)`, `complete(id)`, `stop(id)` all linearly scan `this.sessions.values()` (lines 281–334) every call. The dual session/simple API leaks an implicit session. Cache a `defaultSessionId` set at first `addScribble`.

**Magic numbers buried in tick logic** (worth documenting near the top of the file):

- `8` (lines 455, 479) — point count threshold for transitioning a scribble from `'starting'` to `'active'`.
- `16` (line 490) — millisecond timeout bucket for self-consuming items (likely 60fps sync).
- `200` (lines 222, 328) — clamp on `delayRemaining` when stopping.

**Asymmetric fade modes.** Grouped vs individual fade share no math — grouped is a pure progress calculation (lines 551–556), individual is implicit in the per-item tick. Worth naming the difference in a constant or extracting two named functions.

**Follow-on work.**

1. Expose `scribbles$: Computed<TLScribble[]>` instead of writing into instance state. Editor wires it to instance state via a side-effect sink. Restores testability and decouples from history batching.
2. Move `tickSession`/`tickSessionItems`/`tickSelfConsumingItem`/`tickGroupedFade` into a pure `ScribbleSimulation` module operating on `Session` records — no editor.
3. Inject the timer port.
4. Add `defaultSessionId` for the simple API; document the dual API.

**Suggested port.**

```ts
interface ScribbleDeps {
	options: { laserFadeoutMs: number }
	scheduler: { setTimeout(fn: () => void, ms: number): unknown }
}
// And an output signal `scribbles$: Computed<TLScribble[]>` that the Editor consumes.
```

---

## Latent issues uncovered during audit

These are bugs, smells, and correctness concerns that emerged from the per-manager deep dives but aren't strictly modularity issues. Worth filing as separate tickets.

| #   | Where                                                                                                                                     | Class                 | Severity      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------- |
| 1   | `UserPreferencesManager.ts:8` — shared atom name `'systemColorScheme'` collides across instances                                          | Test isolation hazard | Medium        |
| 2   | `SpatialIndexManager.ts:141–154` — O(n) scan of all indexed shapes on every diff, defeats the O(log n) index                              | Perf                  | High at scale |
| 3   | `SpatialIndexManager.ts` reactive deps on bounds cache are implicit (via capture), not explicit                                           | Correctness           | Medium        |
| 4   | `FontManager.ts:129–151` — linear `document.fonts` scan per font load                                                                     | Perf                  | Medium        |
| 5   | `FontManager.ts` — no `dispose()`; caches and `fontStates` accumulate                                                                     | Memory                | Medium        |
| 6   | `ClickManager.ts:95+38–57` — `lastPointerInfo` mutated and spread into async settle events                                                | Race                  | Low–Medium    |
| 7   | `ClickManager.ts:149–154` — no exit transition from `'overflow'`; user can wedge the state machine                                        | Bug                   | Medium        |
| 8   | `FocusManager.ts:66` — `editor.isIn('select.editing_shape')` reaches into tldraw-package tool path from editor package                    | Layering              | High          |
| 9   | `Editor.blur({ blurContainer: false })` bypasses `FocusManager` and calls `editor.complete()` itself                                      | API consistency       | Low           |
| 10  | `ScribbleManager.tick` routes per-frame state writes through `editor.run()` → `history.batch()`                                           | Correctness           | Medium        |
| 11  | `OverlayManager.ts:116` — `_geometryCache` WeakMap relies on overlay object identity; can leak if `getOverlays()` returns fresh instances | Memory                | Low–Medium    |
| 12  | `OverlayManager` + `OverlayUtil` — no `dispose()`                                                                                         | Memory/lifecycle      | Medium        |
| 13  | `PerformanceManager._notifyInteractionStart` captures `selectedShapeTypes` but never exposes it                                           | Dead work             | Low           |
| 14  | `TickManager` listener lifecycle — root cause of the React-strict-mode camera-state workaround at `Editor.ts:411–416`                     | Bug (papered over)    | Medium        |
| 15  | `CollaboratorsManager.ts:39` — `getInstanceState()` read inside per-collaborator filter (O(n) instance reads per re-evaluation)           | Perf                  | Low           |
| 16  | `CollaboratorsManager.ts:23–25` — visibility interval started unconditionally; violates lazy-attach pattern                               | Resource              | Low           |
| 17  | `EdgeScrollManager` — magic `0.612` small-screen factor with no provenance                                                                | Maintainability       | Low           |
| 18  | `InputsManager.ts:477` — `lrp(0.5)` velocity smoothing is frame-rate-dependent                                                            | UX consistency        | Low           |

---

## Architectural patterns to support modularization

These patterns can be introduced under the hood. None change `Editor`'s public surface — every manager stays accessible at `editor.snaps`, `editor.inputs`, etc.

### 1. Define narrow ports for shared editor surfaces

Each manager declares only the slice of editor it needs as a TypeScript interface in its own folder. Editor already implements all of them. Constructor switches from `(editor: Editor)` to `(deps: SnapEditorPort)`. Tests inject a fake.

Type-only refactor — highest leverage with the lowest risk. Use this as the foundation step everything else builds on.

### 2. Constructor inject everything, instantiate at the Editor seam

Follow `HistoryManager`'s precedent. `new SnapManager(this.asSnapPort())` rather than `new SnapManager(this)`. The Editor becomes a composition root that exposes typed slices of itself to its own managers.

### 3. Replace getter calls with signal inputs where reactive

For `ThemeManager`'s `editor.user.getIsDarkMode()`, `SpatialIndexManager`'s `editor.getCurrentPageId()`, etc., the consumer is already reactive. Pass `Computed<T>` or `Atom<T>` instead of a getter — explicit input, no implicit capture-stack dependency.

### 4. Replace side-effects-into-editor with output signals

Managers that currently write into editor state (`ScribbleManager.tick` → `updateInstanceState`, `InputsManager.updateFromEvent` → `store.put` for `TLPOINTER_ID`) should expose what they want to be the truth as a signal. The Editor subscribes once and applies it. The manager becomes a pure state machine.

```ts
class ScribbleManager {
	readonly scribbles$: Computed<TLScribble[]>
}

// In Editor:
editor.sideEffects.registerInstanceStateSink(scribbles$, (next) => ({ scribbles: next }))
```

This pattern also fixes the latent `editor.run()` → `history.batch()` coupling in `ScribbleManager` (issue 10).

### 5. A typed `Scheduler` port

Several managers reach `editor.timers.setTimeout/setInterval` (Click, Collaborators, Performance, Scribble), and several need a tick lifecycle (Tick, Scribble, EdgeScroll, Performance, Click). Promote both to one port:

```ts
interface Scheduler {
	setTimeout(fn: () => void, ms: number): () => void
	setInterval(fn: () => void, ms: number): () => void
	now(): number
	onTick(fn: (elapsedMs: number) => void): () => void
}
```

`TickManager` _is_ the production implementation. Tests use a deterministic fake. The `process.env.NODE_ENV === 'test'` branch in `TickManager` disappears.

### 6. A `ContainerHost` port for DOM access

`FocusManager`, `TextManager`, `FontManager`, and parts of `Editor` only need `getContainer()` and `getDocument()`. Sharing a port lets jsdom-free unit tests stub these with synthetic elements without needing a `TestEditor`.

### 7. Lazy attach by default

`PerformanceManager` already attaches listeners only when subscribed. Apply this elsewhere:

- `FocusManager`'s body listeners — only attach when focused.
- `CollaboratorsManager`'s visibility interval — only start when `getVisibleCollaborators` has observers.
- `FontManager`'s computed caches — already lazy via signals, but the activation pathway could be more explicit.

A small `Lazy(activator)` helper that runs on first observation and tears down on last reduces overhead in headless / SSR / test contexts.

### 8. Internal event bus for editor-internal notifications

`PerformanceManager`'s six hard-wired `_notify*` call sites are coupling in the wrong direction. Replace them with an internal event channel: Editor emits `'editor:interaction-start'`, `'editor:undo'`, etc.; `PerformanceManager` subscribes. The notification surface becomes uniform, and adding a new metrics consumer doesn't require editing call sites.

### 9. Split each large manager into "wiring" and "domain"

For Snap, Scribble, Inputs, Font, Performance:

```
SnapManager/
  SnapManager.ts          # public class, ~80 lines, wiring only
  ports.ts                # the editor port this manager needs
  domain/
    snapBounds.ts         # pure
    snapGaps.ts           # pure
    gatherSnappableShapes.ts
  SnapManager.test.ts     # against fake port
```

The wiring file becomes trivial; logic moves to `domain/` and gets pure-function tests.

### 10. One canonical disposal pattern

Disposal is uneven today:

- Some managers `editor.disposables.add(...)` from inside their constructor (`TickManager`, `FocusManager`).
- Some return `dispose()` that the Editor calls (`SpatialIndex`, `Theme`, `User`, `Text`, `Performance`).
- Some have **no `dispose()` at all** (`Snap`, `Collaborators`, `EdgeScroll`, `Inputs`, `Click`, `Scribble`, `Font`, `OverlayManager`, `OverlayUtil`) — issues 5, 12 in the latent issues table.

Pick one: every manager exposes `dispose()`. A `ManagerRegistry.dispose()` calls them in reverse registration order. Constructors stop side-effecting `editor.disposables.add`.

### 11. Decompose dual-purpose managers

Three managers do more than their name suggests:

- `InputsManager` ≈ input state + presence bridge + collaborator awareness → split out `PointerPresenceBridge`.
- `FontManager` ≈ font-face lifecycle + shape-font tracking → split into `FontRegistry` + `ShapeFontTracker`.
- `FocusManager` ≈ focus state + DOM CSS + tool-state side effects → split into `FocusController` + `FocusDom`.

Each split is small, scoped, and unlocks isolated tests for both halves.

---

## Suggested sequencing

Cost-ordered plan letting modularity wins ship incrementally. Each step is independent and preserves `editor.xxx` accessors.

1. **Define `ContainerHost`, `Scheduler`, and per-manager `*Port` interfaces.** Type-only PR. Editor implements them by exposing its own surface; no runtime change.
2. **Port `TickManager` to `{ onTick, raf, caf, now }`.** Smallest manager, smallest blast radius. Demote `updatePointerVelocity` to an ordinary frame listener. Resolve the React-strict-mode issue properly while you're there.
3. **Port `ThemeManager` and `UserPreferencesManager`.** Move `defaultThemes.ts` into `tlschema`. Fix the shared atom name in `UserPreferencesManager`.
4. **Port `TextManager`, `FocusManager`, `FontManager` to `ContainerHost`.** Add `dispose()` to `FontManager`. Decompose `FocusManager`; inject `isEditingShape` to kill the layering violation.
5. **Move `InputsManager`'s pointer-presence write to a new `PointerPresenceBridge`.** Recover a clean state-holder.
6. **Split `SnapManager` into `gather` + pure snap math.** Biggest readability win.
7. **Convert `ScribbleManager` to expose `scribbles$`; Editor consumes it.** Removes the only manager that writes back through `updateInstanceState` every tick. Fixes the history-batching concern.
8. **Refactor `EdgeScrollManager` to a pure step function.**
9. **Adopt `ManagerRegistry` with uniform `dispose()`.** Pays for fixes #5, #12 in the latent issues table.
10. **Investigate the `SpatialIndexManager` O(n) scan.** Either prove the diff is incomplete (and document) or remove the loop and add the regression tests.
11. **Last:** consider migrating `OverlayUtil`, `ShapeUtil`, `BindingUtil`, `AssetUtil` constructors to context ports — public API change, major-version-coordinated.

---

## What this report deliberately does _not_ propose

- Splitting any manager into its own npm package. The directory structure inside `packages/editor` is sufficient boundary.
- Removing any `editor.someManager` accessor. The public surface is the contract; this report only restructures internals.
- Changing the reactive system (`@tldraw/state`). The signal patterns here ride on what's already there.
- Touching the tool/state-node system. Tools are a separate modularity question.
