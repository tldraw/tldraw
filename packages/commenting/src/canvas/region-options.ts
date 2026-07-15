import { Editor, VecLike } from 'tldraw'

/**
 * The configurable dimensions of region comments — a design surface for prototyping the interaction
 * before settling it. Region is **off by default**, so a consumer that leaves it unset keeps plain
 * click-only point/shape commenting. Set it per editor through `<CanvasComments regionOptions>`.
 */
export interface RegionCommentOptions {
	/** Whether dragging the comment tool out creates a region anchor. Off → click-only. */
	enabled: boolean
	/** Which corner the pin and composer sit on, as a normalized 0–1 offset. Default bottom-right. */
	pinCorner: VecLike
	/** When the dashed box and its handles reveal: while the pointer is within the region, while the
	 *  pin is hovered, or only while the thread is open. */
	reveal: 'pointer' | 'pin-hover' | 'open'
	/** How a region is moved: dragging its pin, dragging its body, or either. */
	move: 'pin' | 'body' | 'both'
	/** The resize affordance: corner handles, edge handles, or none. */
	resize: 'corners' | 'edges' | 'none'
}

/** The out-of-the-box region config: disabled, and — when a consumer enables it — the current
 *  bottom-right / pointer-reveal / pin-move / corner-resize behaviour. */
export const DEFAULT_REGION_COMMENT_OPTIONS: RegionCommentOptions = {
	enabled: false,
	pinCorner: { x: 1, y: 1 },
	reveal: 'pointer',
	move: 'pin',
	resize: 'corners',
}

// Per-editor region config. The overlay publishes its merged `regionOptions` here so the comment
// tool — which has no props of its own — can read the same per-instance config at interaction time.
const byEditor = new WeakMap<Editor, RegionCommentOptions>()

/** Publish an editor's region config (called by the overlay from its `regionOptions` prop). */
export function setRegionCommentOptions(editor: Editor, options: RegionCommentOptions): void {
	byEditor.set(editor, options)
}

/** The editor's region config, or the disabled default when none was set. */
export function getRegionCommentOptions(editor: Editor): RegionCommentOptions {
	return byEditor.get(editor) ?? DEFAULT_REGION_COMMENT_OPTIONS
}
