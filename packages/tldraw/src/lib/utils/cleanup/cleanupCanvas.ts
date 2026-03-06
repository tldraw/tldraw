import { Editor, TLShapeId } from '@tldraw/editor'
import { rerouteArrows } from './rerouteArrows'
import { resolveShapeOverlaps } from './resolveShapeOverlaps'
import { resolveTextWordWrap } from './resolveTextWordWrap'

/** @public */
export interface CleanupCanvasOptions {
	/**
	 * The shape IDs to process. All three sub-functions default to direct children of the current
	 * page (not inside frames or groups). See {@link resolveTextWordWrap} and
	 * {@link resolveShapeOverlaps} for details on how an explicit list is interpreted by each.
	 */
	shapeIds?: TLShapeId[]
	/**
	 * Minimum gap (in page units) between shapes during overlap resolution. Default is 20.
	 * See {@link resolveShapeOverlaps}.
	 */
	padding?: number
	/**
	 * Maximum number of overlap-separation iterations. Default is 50.
	 * See {@link resolveShapeOverlaps}.
	 */
	maxIterations?: number
	/**
	 * Minimum clearance (in page units) between arrow paths and obstacle shapes. Default is 4.
	 * See {@link rerouteArrows}.
	 */
	arrowClearance?: number
	/**
	 * Bend candidates to evaluate during arrow rerouting. See {@link rerouteArrows}.
	 */
	arrowBendCandidates?: number[]
}

/**
 * Runs {@link resolveTextWordWrap}, {@link resolveShapeOverlaps}, and {@link rerouteArrows} as a
 * single undoable operation. Recommended entry point for programmatic canvas cleanup (e.g. after
 * rendering a mermaid diagram).
 *
 * Passes run in order: word wrap first (so overlap resolution uses final shape sizes), then overlap
 * resolution (so arrow rerouting evaluates paths against final positions), then arrow rerouting.
 *
 * @public
 */
export function cleanupCanvas(editor: Editor, opts: CleanupCanvasOptions = {}) {
	editor.run(() => {
		resolveTextWordWrap(editor, { shapeIds: opts.shapeIds })
		resolveShapeOverlaps(editor, {
			shapeIds: opts.shapeIds,
			padding: opts.padding,
			maxIterations: opts.maxIterations,
		})
		rerouteArrows(editor, {
			shapeIds: opts.shapeIds,
			clearance: opts.arrowClearance,
			bendCandidates: opts.arrowBendCandidates,
		})
	})
}
