import { atom, computed } from '@tldraw/state'
import { VecLike } from '../../primitives/Vec'
import type { Editor } from '../Editor'
import { OverlayUtil, TLOverlay } from './OverlayUtil'

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
		if (this._overlayUtils.has(type)) {
			throw new Error(`Duplicate overlay util type: "${type}"`)
		}
		this._overlayUtils.set(type, util)
	}

	/**
	 * Get an overlay util by type.
	 * @public
	 */
	getUtil<T extends OverlayUtil>(type: string): T {
		const util = this._overlayUtils.get(type)
		if (!util) throw new Error(`No overlay util found for type: "${type}"`)
		return util as T
	}

	/**
	 * Reactively computed list of all currently active overlays.
	 * @public
	 */
	@computed getActiveOverlays(): TLOverlay[] {
		const overlays: TLOverlay[] = []
		for (const util of this._overlayUtils.values()) {
			if (util.isActive()) {
				overlays.push(...util.getOverlays())
			}
		}
		return overlays
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
		return this.getActiveOverlays().find((o) => o.id === id) ?? null
	}

	setHoveredOverlay(id: string | null) {
		if (id === this._hoveredOverlayId.get()) return
		this._hoveredOverlayId.set(id)
	}

	/**
	 * Hit test all active overlays at a given page point.
	 * Returns the first overlay whose geometry contains the point, or null.
	 * Interactive overlays (those with geometry) are checked; non-interactive are skipped.
	 *
	 * @param point - Point in page coordinates
	 * @param margin - Hit test margin
	 * @public
	 */
	getOverlayAtPoint(point: VecLike, margin = 0): TLOverlay | null {
		for (const util of this._overlayUtils.values()) {
			if (!util.isActive()) continue
			const overlays = util.getOverlays()
			for (const overlay of overlays) {
				const geometry = util.getGeometry(overlay)
				if (!geometry) continue
				if (geometry.hitTestPoint(point, margin, true)) {
					return overlay
				}
			}
		}
		return null
	}

	/**
	 * Get the overlay util for a given overlay instance.
	 * @public
	 */
	getUtilForOverlay(overlay: TLOverlay): OverlayUtil {
		return this.getUtil(overlay.type)
	}
}
