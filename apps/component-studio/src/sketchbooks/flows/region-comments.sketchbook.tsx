import { Sketch, Sketchbook } from '../../sketch'
import { RegionCommentsFlow, RegionCommentsFlowProps } from './region-comments'

const sketchbook: Sketchbook<RegionCommentsFlowProps> = {
	title: 'Flows/Region comments',
	component: RegionCommentsFlow,
}
export default sketchbook

const desktop = { viewport: 'desktop' } as const

/** The creation flow, from an empty canvas: drag out a rectangle to make a region comment. Default
 *  behaviour — bottom-right pin, reveal on pointer-in-region, move by pin, resize from corners. */
export const Default: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: {}, seeded: false },
}

// — Pin/anchor corner —

/** Pin and composer on the top-right corner instead of bottom-right. */
export const TopRightPin: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: { pinCorner: { x: 1, y: 0 } } },
}

// — Reveal behaviour —

/** Box and handles reveal only while the pin is hovered (note the gap reaching a far corner). */
export const RevealOnPinHover: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: { reveal: 'pin-hover' } },
}

/** Box and handles reveal only while the thread is open. */
export const RevealWhenOpen: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: { reveal: 'open' } },
}

// — Move interaction —

/** Move by dragging the region body (the pin only toggles the thread). */
export const MoveByBody: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: { move: 'body' } },
}

/** Move by dragging either the pin or the body. */
export const MoveByEither: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: { move: 'both' } },
}

// — Resize affordance —

/** Resize from side-midpoint edge handles (each locks the perpendicular axis). */
export const ResizeFromEdges: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: { resize: 'edges' } },
}

/** No resize affordance — the region keeps the size it was drawn at. */
export const NoResize: Sketch<RegionCommentsFlowProps> = {
	parameters: desktop,
	args: { regionOptions: { resize: 'none' } },
}
