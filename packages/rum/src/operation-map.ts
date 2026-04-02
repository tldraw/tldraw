import type { RumOperationType } from './types'

/**
 * Maps the leaf segment of an editor state path to a {@link RumOperationType}.
 *
 * The editor path looks like `"select.resizing"` or `"hand.dragging"`.
 * We extract the leaf (last segment) and, for ambiguous states like `"dragging"`,
 * use the full path to disambiguate.
 */

const LEAF_TO_OPERATION: Record<string, RumOperationType> = {
	resizing: 'resize',
	translating: 'translate',
	rotating: 'rotate',
	brushing: 'brush',
	drawing: 'draw',
	erasing: 'erase',
	cropping: 'crop',
	dragging_handle: 'drag_handle',
	scribble_brushing: 'scribble_brush',
	lasering: 'laser',
}

/**
 * Given the full editor path (e.g. `"select.resizing"`), return the
 * {@link RumOperationType} or `null` if the state is not one we measure.
 * @public
 */
export function operationFromPath(path: string): RumOperationType | null {
	const leaf = path.split('.').pop()
	if (!leaf) return null

	// "dragging" is ambiguous — hand.dragging is pan, everything else is translate
	if (leaf === 'dragging') {
		return path.startsWith('hand') ? 'pan' : 'translate'
	}

	return LEAF_TO_OPERATION[leaf] ?? null
}
