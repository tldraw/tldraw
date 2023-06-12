import { StrokeOptions } from '@tldraw/primitives'

export function getDrawStrokeInfo(strokeWidth: number) {
	const options: StrokeOptions = {
		size: strokeWidth * 1.3,
		thinning: 0.36,
		streamline: 0,
		smoothing: 0.25,
		simulatePressure: true,
		last: true,
	}
	return options
}
