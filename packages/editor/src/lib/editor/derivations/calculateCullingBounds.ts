import { Box } from '../../primitives/Box'

/**
 * Margin percentage for expanding culling bounds around viewport.
 * @internal
 */
export const CULLING_MARGIN = 0.2

/**
 * Calculate expanded viewport bounds for culling decisions.
 * Expands bounds by margin to reduce recalculation frequency during pan/zoom.
 *
 * @param viewportBounds - The current viewport bounds
 * @returns Expanded Box with margins applied to all sides
 */
export function calculateCullingBounds(viewportBounds: Box): Box {
	const horizontalMargin = viewportBounds.width * CULLING_MARGIN
	const verticalMargin = viewportBounds.height * CULLING_MARGIN

	return new Box(
		viewportBounds.x - horizontalMargin,
		viewportBounds.y - verticalMargin,
		viewportBounds.width + horizontalMargin * 2,
		viewportBounds.height + verticalMargin * 2
	)
}
