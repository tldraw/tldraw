import { Box } from '@tldraw/editor'

export const roundedBox = (box: Box, accuracy = 0.01) => {
	// for some reason jest treats -0 and 0 as not equal, so prevent -0s from appearing
	const noNegativeZero = (value: number) => (value === 0 ? 0 : value)

	return new Box(
		noNegativeZero(Math.round(box.x / accuracy) * accuracy),
		noNegativeZero(Math.round(box.y / accuracy) * accuracy),
		noNegativeZero(Math.round(box.w / accuracy) * accuracy),
		noNegativeZero(Math.round(box.h / accuracy) * accuracy)
	)
}
