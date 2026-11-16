import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
} from '@tldraw/state'
import { TLShape, TLShapeId, isShape } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import type { VecLike } from '../../../primitives/Vec'
import type { Editor } from '../../Editor'
import type { ShapesWithDirtyBounds } from './getShapesWithDirtyBounds'
import { getShapeBoundsChangesSince } from './shapeBoundsChanges'

/**
 * Told about each change to a {@link CurrentPageBoundsCache} as it is applied, for consumers
 * that keep their own incremental state. The calls happen while the cache is being read, by any
 * reader, so they must not read or write reactive state.
 *
 * @internal
 */
export interface CurrentPageBoundsCacheListener {
	/** A shape's bounds were added (no `prev`), removed (no `next`) or changed. */
	onChange(id: TLShapeId, prev: Box | undefined, next: Box | undefined): void
	/** Every entry was discarded and recomputed. `onChange` is not called for these. */
	onRebuild(): void
}

interface BoundsMaps {
	bounds: Map<TLShapeId, Box>
	// Local-space clip paths of the shapes that have one, to spot clip changes that come from
	// derived geometry rather than a record change.
	clipPaths: Map<TLShapeId, VecLike[]>
}

/**
 * An incrementally maintained map of page-space bounds for the shapes on the current page.
 *
 * A computed that reads per-shape bounds for the whole page has to revalidate every shape's
 * bounds on every store change, which costs milliseconds per change on large pages. This instead
 * recomputes only the shapes that a change could have affected (see `getShapeBoundsChangesSince`),
 * and rebuilds on page, theme and font changes.
 *
 * The maps are only kept while something is subscribed. A read from outside a reaction (a one-off
 * zoom to fit, say) builds them, and they are dropped again once the current task is done.
 *
 * `getBounds` may depend on ancestors' clip paths (masked bounds): when a dirty shape's clip path
 * changes without its record changing, as with a container whose geometry fits its children, its
 * descendants are rechecked too.
 *
 * The price is reactivity: `getBounds` runs without capturing, so a shape's entry is only
 * refreshed when that shape is dirty. Bounds that depend on anything other than the shape's
 * record, its ancestors, its bindings, the theme or its fonts go stale until the shape changes.
 * That includes geometry, `getClipPath` or `shouldClipChild` that read an atom or other editor
 * state. The spatial index already has the same limit for geometry.
 *
 * @internal
 */
export class CurrentPageBoundsCache {
	// Null until the first read, after a change that needs a rebuild, and once released.
	private maps: BoundsMaps | null = null
	private isReleaseQueued = false
	// Kept as extents, not a Box: comparing against a derived `x + w` would miss boxes that
	// sit exactly on the edge.
	private readonly common = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
	private isCommonStale = true
	private readonly listeners = new Set<CurrentPageBoundsCacheListener>()
	private readonly epoch: Computed<number>

	constructor(
		private readonly editor: Editor,
		name: string,
		/** Get the page-space bounds for a shape. Return undefined to leave the shape out. */
		private readonly getBounds: (shape: TLShape) => Box | undefined
	) {
		this.epoch = computed<number>(name, (prevEpoch, lastComputedEpoch) => {
			const changes = getShapeBoundsChangesSince(editor, prevEpoch, lastComputedEpoch)
			const epoch = isUninitialized(prevEpoch) ? 0 : prevEpoch

			if (changes === RESET_VALUE) {
				// `get` builds the maps again.
				this.maps = null
				return epoch + 1
			}
			if (!changes) return epoch

			const { maps } = this
			// Released, so there is nothing to compare against: assume the bounds changed.
			if (!maps) return epoch + 1

			const didChange = unsafe__withoutCapture(() => this.update(maps, changes))
			return didChange ? epoch + 1 : epoch
		})
	}

	/**
	 * The bounds by shape id, in no particular order. Reactive: reading it inside a computed or
	 * reaction subscribes to changes. The map is updated in place, so don't hold on to it or
	 * compare it by identity.
	 */
	get(): ReadonlyMap<TLShapeId, Box> {
		this.epoch.get()
		const maps = (this.maps ??= unsafe__withoutCapture(() => this.build()))
		if (!this.epoch.isActivelyListening) this.releaseUnlessSubscribed()
		return maps.bounds
	}

	/**
	 * The common bounds of every entry, or undefined if there are none. Reactive, like
	 * {@link CurrentPageBoundsCache.get}.
	 */
	getCommonBounds(): Box | undefined {
		const bounds = this.get()
		const common = this.common
		if (this.isCommonStale) {
			common.minX = common.minY = Infinity
			common.maxX = common.maxY = -Infinity
			for (const box of bounds.values()) this.expandCommon(box)
			this.isCommonStale = false
		}
		if (bounds.size === 0) return undefined
		return new Box(common.minX, common.minY, common.maxX - common.minX, common.maxY - common.minY)
	}

	/** Listen for changes as they are applied. Returns a function that stops listening. */
	addListener(listener: CurrentPageBoundsCacheListener) {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	private expandCommon(bounds: Box) {
		const { common } = this
		common.minX = Math.min(common.minX, bounds.minX)
		common.minY = Math.min(common.minY, bounds.minY)
		common.maxX = Math.max(common.maxX, bounds.maxX)
		common.maxY = Math.max(common.maxY, bounds.maxY)
	}

	// The common bounds can only shrink when a box on its edge moves or goes away, so any
	// other change can be folded in without visiting every entry.
	private updateCommon(prev: Box | undefined, next: Box | undefined) {
		if (this.isCommonStale) return
		const { common } = this
		if (
			prev &&
			(prev.minX <= common.minX ||
				prev.minY <= common.minY ||
				prev.maxX >= common.maxX ||
				prev.maxY >= common.maxY)
		) {
			this.isCommonStale = true
		} else if (next) {
			this.expandCommon(next)
		}
	}

	private set(
		boundsById: BoundsMaps['bounds'],
		id: TLShapeId,
		prev: Box | undefined,
		next: Box | undefined
	) {
		if (next) boundsById.set(id, next)
		else boundsById.delete(id)
		this.updateCommon(prev, next)
		for (const listener of this.listeners) listener.onChange(id, prev, next)
	}

	private releaseUnlessSubscribed() {
		if (this.isReleaseQueued) return
		this.isReleaseQueued = true
		// Deferred because this read may be a reaction's first run, which only subscribes once
		// it has finished. It also lets a burst of one-off reads share one build.
		queueMicrotask(() => {
			this.isReleaseQueued = false
			if (!this.epoch.isActivelyListening) this.maps = null
		})
	}

	private build(): BoundsMaps {
		this.isCommonStale = true
		for (const listener of this.listeners) listener.onRebuild()
		const maps: BoundsMaps = { bounds: new Map(), clipPaths: new Map() }
		for (const shape of this.editor.getCurrentPageShapes()) {
			const bounds = this.getBounds(shape)
			if (bounds) maps.bounds.set(shape.id, bounds)
			const clipPath = this.editor.getShapeUtil(shape).getClipPath?.(shape)
			if (clipPath) maps.clipPaths.set(shape.id, clipPath)
		}
		return maps
	}

	/** Record the shape's current clip path; true if it differs from the last one seen. */
	private updateClipPath(
		clipPaths: BoundsMaps['clipPaths'],
		shape: TLShape | undefined,
		id: TLShapeId
	): boolean {
		const next = shape ? this.editor.getShapeUtil(shape).getClipPath?.(shape) : undefined
		const prev = clipPaths.get(id)
		if (next) clipPaths.set(id, next)
		else clipPaths.delete(id)
		return !arePolygonsEqual(prev, next)
	}

	private update({ bounds: boundsById, clipPaths }: BoundsMaps, changes: ShapesWithDirtyBounds) {
		const { dirty, removed } = changes
		const currentPageId = this.editor.getCurrentPageId()
		let didChange = false

		for (const id of removed) {
			const prev = boundsById.get(id)
			if (prev) {
				this.set(boundsById, id, prev, undefined)
				didChange = true
			}
			clipPaths.delete(id)
		}

		const queue = [...dirty]
		const queued = new Set(dirty)
		while (queue.length) {
			const id = queue.pop()!
			const record = this.editor.store.unsafeGetWithoutCapture(id)
			const shape =
				record && isShape(record) && this.editor.getAncestorPageId(record) === currentPageId
					? record
					: undefined

			// Descendants' masks are built from this shape's clip path. A record change that moves
			// or resizes it already dirtied them, but a clip path derived from other shapes (like
			// children) can change while its record doesn't.
			if (this.updateClipPath(clipPaths, shape, id)) {
				this.editor.visitDescendants(id, (childId) => {
					if (!queued.has(childId)) {
						queued.add(childId)
						queue.push(childId)
					}
				})
			}

			const bounds = shape ? this.getBounds(shape) : undefined
			const prev = boundsById.get(id)

			if (bounds ? !prev || !Box.Equals(prev, bounds) : prev) {
				this.set(boundsById, id, prev, bounds)
				didChange = true
			}
		}

		return didChange
	}
}

function arePolygonsEqual(a: VecLike[] | undefined, b: VecLike[] | undefined) {
	if (a === b) return true
	if (!a || !b || a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false
	}
	return true
}
