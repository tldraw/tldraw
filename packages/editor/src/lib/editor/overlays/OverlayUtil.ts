import { TLCursorType } from '@tldraw/tlschema'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import type { Editor } from '../Editor'
import { TLPointerEventInfo } from '../types/event-types'

/** @public */
export interface TLOverlay<Props = Record<string, unknown>> {
	/**
	 * Globally unique id for this overlay instance across all overlay utils.
	 * Hit-test and hover lookup key on `id` alone, so utils must namespace their
	 * ids (e.g. `'selection_fg:top_left'`, `'handle:<shapeId>:<handleId>'`) to
	 * avoid colliding with overlays from other utils.
	 */
	id: string
	/** The overlay util type that owns this instance */
	type: string
	/** Arbitrary props for the overlay (handle id, corner name, etc.) */
	props: Props
}

/** @public */
export interface TLOverlayUtilConstructor<U extends OverlayUtil = OverlayUtil> {
	new (editor: Editor): U
	type: string
	configure<T extends TLOverlayUtilConstructor<any>>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T
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
 * - Render into a canvas 2D context
 *
 * @public
 */
export abstract class OverlayUtil<T extends TLOverlay = TLOverlay> {
	constructor(public editor: Editor) {}
	static type: string

	/**
	 * Options for this overlay util. Override this to provide customization options.
	 * Use {@link OverlayUtil.configure} to customize existing overlay utils.
	 *
	 * `zIndex` controls paint and hit-test order across utils — higher numbers
	 * paint on top and are hit-tested first. Ties resolve by registration order.
	 * Defaults to `0`; built-in utils use larger integers (100, 200, …) with
	 * gaps so custom utils can slot between.
	 *
	 * @public
	 */
	options: { zIndex?: number } = {}

	/**
	 * Create a new overlay util class with the given options merged in.
	 *
	 * @example
	 * ```ts
	 * const MyBrush = BrushOverlayUtil.configure({ fill: 'rgba(0,0,255,0.1)' })
	 * ```
	 *
	 * @public
	 */
	static configure<T extends TLOverlayUtilConstructor<any>>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T {
		// @ts-expect-error -- typescript has no idea what's going on here but it's fine
		return class extends this {
			// @ts-expect-error
			options = { ...this.options, ...options }
		}
	}

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
	 * Called when the user points down on this overlay, before the default
	 * routing runs. Acts as an interrupt: define it to take over the event.
	 *
	 * Return `false` to continue with the default behavior (e.g. the
	 * built-in rotate/resize handle transitions or shape-handle dispatch).
	 * Return `true` — or nothing at all — to skip the default. In other
	 * words, once you override this method you own the event unless you
	 * explicitly opt back in by returning `false`.
	 */
	onPointerDown?(overlay: T, info: TLPointerEventInfo): boolean | void

	/**
	 * Render all active overlays into the canvas context.
	 * The context is already transformed to page space (camera transform applied).
	 * Called reactively when overlays or editor state changes.
	 */
	render(_ctx: CanvasRenderingContext2D, _overlays: T[]): void {}

	/**
	 * Optional: render all active overlays into the minimap canvas.
	 * The context is already transformed to page space (minimap camera applied),
	 * so overlays can use the same page-space coordinates as in {@link OverlayUtil.render}.
	 *
	 * `zoom` is the minimap's screen-pixels-per-page-unit, analogous to
	 * `editor.getCamera().z`; use `1 / zoom` for one-minimap-pixel line widths.
	 *
	 * Most overlays should leave this blank — only overlays that are meaningful
	 * at minimap scale (e.g. brushes, collaborator cursors) should opt in.
	 */
	renderMinimap(_ctx: CanvasRenderingContext2D, _overlays: T[], _zoom: number): void {}
}
