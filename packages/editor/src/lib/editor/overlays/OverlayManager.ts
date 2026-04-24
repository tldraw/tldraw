import { atom, computed } from '@tldraw/state'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { VecLike } from '../../primitives/Vec'
import type { Editor } from '../Editor'
import { OverlayUtil, TLOverlay } from './OverlayUtil'

/**
 * An active overlay util paired with the overlays it produced for the current
 * editor state. Returned by {@link OverlayManager.getActiveOverlayEntries} so
 * hit-test, render, and debug paths share a single scan per reactive tick.
 *
 * @public
 */
export interface TLOverlayEntry {
	util: OverlayUtil
	overlays: TLOverlay[]
}

/** @public */
export class OverlayManager {
	constructor(public readonly editor: Editor) {}

	/** @internal */
	readonly _overlayUtils = new Map<string, OverlayUtil>()

	/**
	 * Register an overlay util instance. Called during editor construction.
	 * @internal
	 */
	registerUtil(util: OverlayUtil) {
		const type = (util.constructor as typeof OverlayUtil).type
		if (!type) {
			throw new Error(`Overlay util ${util.constructor.name} is missing a static 'type' property.`)
		}
		if (this._overlayUtils.has(type)) {
			throw new Error(`Duplicate overlay util type: "${type}"`)
		}
		this._overlayUtils.set(type, util)
	}

	/**
	 * Get an overlay util by type string, overlay instance, or by passing
	 * a util class as a generic parameter for type-safe lookup.
	 *
	 * @example
	 * ```ts
	 * const util = editor.overlays.getOverlayUtil('brush')
	 * const util = editor.overlays.getOverlayUtil<BrushOverlayUtil>('brush')
	 * const util = editor.overlays.getOverlayUtil(myOverlay)
	 * ```
	 *
	 * @public
	 */
	getOverlayUtil<T extends OverlayUtil>(
		type: T extends OverlayUtil<infer O> ? O['type'] : string
	): T
	getOverlayUtil<O extends TLOverlay>(overlay: O): OverlayUtil<O>
	getOverlayUtil(arg: string | TLOverlay): OverlayUtil {
		const type = typeof arg === 'string' ? arg : arg.type
		const util = this._overlayUtils.get(type)
		if (!util) throw new Error(`No overlay util found for type: "${type}"`)
		return util
	}

	/**
	 * Returns all registered overlay utils in paint order (ascending zIndex).
	 * Utils with the same zIndex preserve their registration order.
	 *
	 * @public
	 */
	@computed getOverlayUtilsInZOrder(): OverlayUtil[] {
		const utils = Array.from(this._overlayUtils.values())
		// Stable sort by zIndex (registration order breaks ties).
		return utils
			.map((util, i) => ({ util, i, z: util.options.zIndex ?? 0 }))
			.sort((a, b) => a.z - b.z || a.i - b.i)
			.map((entry) => entry.util)
	}

	/**
	 * Reactive list of active overlay utils paired with the overlays they
	 * produced for the current editor state, in paint order (ascending
	 * zIndex). Both the hit-test and render paths read from this single
	 * cached scan instead of each re-deriving the active set. Active utils
	 * are included even when their `getOverlays()` returns an empty array,
	 * since `render()` may still draw non-interactive UI (e.g. the selection
	 * bounding box during brushing).
	 *
	 * @public
	 */
	@computed getActiveOverlayEntries(): TLOverlayEntry[] {
		const entries: TLOverlayEntry[] = []
		for (const util of this.getOverlayUtilsInZOrder()) {
			if (!util.isActive()) continue
			entries.push({ util, overlays: util.getOverlays() })
		}
		return entries
	}

	/**
	 * Reactively computed list of all currently active overlays, in paint order.
	 * @public
	 */
	@computed getCurrentOverlays(): TLOverlay[] {
		const all: TLOverlay[] = []
		for (const { overlays } of this.getActiveOverlayEntries()) {
			all.push(...overlays)
		}
		return all
	}

	// Hit-test geometry cache keyed by overlay identity. Entries remain valid
	// while getActiveOverlayEntries() keeps returning the same overlay
	// instances; when its reactive deps change, getOverlays() emits fresh
	// objects and stale entries fall out by GC.
	private _geometryCache = new WeakMap<TLOverlay, Geometry2d | null>()

	/**
	 * Get hit-test geometry for an overlay, cached by overlay identity. Lets
	 * hit-testing on a pointermove storm skip the per-overlay geometry
	 * allocation that {@link OverlayUtil.getGeometry} would otherwise do on
	 * every call.
	 *
	 * @public
	 */
	getOverlayGeometry(overlay: TLOverlay): Geometry2d | null {
		const cached = this._geometryCache.get(overlay)
		if (cached !== undefined) return cached
		const util = this.getOverlayUtil(overlay)
		const geometry = util.getGeometry(overlay)
		this._geometryCache.set(overlay, geometry)
		return geometry
	}

	/**
	 * The currently hovered overlay id.
	 * @public
	 */
	private _hoveredOverlayId = atom<string | null>('hoveredOverlayId', null)

	getHoveredOverlayId(): string | null {
		return this._hoveredOverlayId.get()
	}

	getHoveredOverlay(): TLOverlay | null {
		const id = this._hoveredOverlayId.get()
		if (!id) return null
		return this.getCurrentOverlays().find((o) => o.id === id) ?? null
	}

	setHoveredOverlay(id: string | null) {
		if (id === this._hoveredOverlayId.get()) return
		this._hoveredOverlayId.set(id)
	}

	/**
	 * Hit test all active overlays at a given page point.
	 * Returns the topmost overlay whose geometry contains the point, or null.
	 * Utils are walked from highest zIndex to lowest so the overlay painted on
	 * top also wins the hit test. Within a util, overlays are walked in
	 * array order: the first overlay whose geometry contains the point wins,
	 * so utils should place highest-priority overlays first in `getOverlays`.
	 * Interactive overlays (those with geometry) are checked; non-interactive are skipped.
	 *
	 * @param point - Point in page coordinates
	 * @param margin - Hit test margin
	 * @public
	 */
	getOverlayAtPoint(point: VecLike, margin = 0): TLOverlay | null {
		const entries = this.getActiveOverlayEntries()
		for (let i = entries.length - 1; i >= 0; i--) {
			const { overlays } = entries[i]
			for (const overlay of overlays) {
				const geometry = this.getOverlayGeometry(overlay)
				if (!geometry) continue
				if (geometry.hitTestPoint(point, geometry.isFilled ? 0 : margin, true)) {
					return overlay
				}
			}
		}
		return null
	}
}
