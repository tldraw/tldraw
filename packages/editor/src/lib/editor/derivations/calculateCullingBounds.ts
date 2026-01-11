import { Box } from '../../primitives/Box'

/**
 * Calculate expanded viewport bounds for culling decisions.
 * Expands bounds by margin to reduce recalculation frequency during pan/zoom.
 *
 * @param viewportBounds - The current viewport bounds
 * @param margin - Margin percentage (e.g., 0.2 for 20%)
 * @returns Expanded Box with margins applied to all sides
 */
export function calculateCullingBounds(viewportBounds: Box, margin: number): Box {
	const horizontalMargin = viewportBounds.width * margin
	const verticalMargin = viewportBounds.height * margin

	return new Box(
		viewportBounds.x - horizontalMargin,
		viewportBounds.y - verticalMargin,
		viewportBounds.width + horizontalMargin * 2,
		viewportBounds.height + verticalMargin * 2
	)
}
