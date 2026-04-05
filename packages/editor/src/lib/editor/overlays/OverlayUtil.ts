import { TLCursorType } from '@tldraw/tlschema'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import type { Editor } from '../Editor'

/** @public */
export interface TLOverlay {
	/** Unique id for this overlay instance, e.g. 'selection_fg:top_left_resize' */
	id: string
	/** The overlay util type that owns this instance */
	type: string
	/** Arbitrary props for the overlay (handle id, corner name, etc.) */
	props: Record<string, unknown>
}

/** @public */
export interface TLOverlayUtilConstructor<U extends OverlayUtil = OverlayUtil> {
	new (editor: Editor): U
	type: string
}

/** @public */
export type TLAnyOverlayUtilConstructor = TLOverlayUtilConstructor<any>

/**
 * Base class for overlay utilities. Overlays are ephemeral UI elements rendered
 * on top of the canvas (selection handles, rotation corners, shape handles, etc.).
 *
 * Each OverlayUtil defines a type of overlay and knows how to:
 * - Determine when its overlays should be active (predicate)
 * - Produce overlay instances from current editor state
 * - Provide hit-test geometry for interactive overlays
 * - Provide cursor style on hover
 *
 * @public
 */
export abstract class OverlayUtil<T extends TLOverlay = TLOverlay> {
	constructor(public editor: Editor) {}
	static type: string

	/**
	 * Whether this overlay util's overlays should currently be active.
	 * Checked reactively to determine which overlays exist at any given time.
	 */
	abstract isActive(): boolean

	/**
	 * Returns the overlay instances that currently exist.
	 * Called only when `isActive()` returns true.
	 */
	abstract getOverlays(): T[]

	/**
	 * Returns hit-test geometry for an overlay instance, in page coordinates.
	 * Return null for non-interactive overlays (e.g. snap indicators, scribbles).
	 */
	getGeometry(_overlay: T): Geometry2d | null {
		return null
	}

	/**
	 * Returns the cursor type to show when hovering this overlay.
	 */
	getCursor(_overlay: T): TLCursorType | undefined {
		return undefined
	}

	/**
	 * Render all active overlays into the canvas context.
	 * The context is already transformed to page space (camera transform applied).
	 * Called reactively when overlays or editor state changes.
	 *
	 * Return false or undefined to indicate nothing was rendered.
	 */
	render(_ctx: CanvasRenderingContext2D, _overlays: T[]): void {}
}
