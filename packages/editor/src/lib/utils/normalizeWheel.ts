import { tlenv } from '../globals/environment'

const MAX_ZOOM_STEP = 10

/**
 * Normalizes a wheel event, so that the delta values are consistent across different browsers or devices. Adapted from https://stackoverflow.com/a/13650579.
 * @param event - The wheel event to normalize.
 * @returns The normalized wheel event.
 * @internal */
export function normalizeWheel(event: WheelEvent | React.WheelEvent<HTMLElement>) {
	let { deltaY, deltaX } = event
	let deltaZ = 0

	// wheeling
	if (event.ctrlKey || event.altKey || event.metaKey) {
		deltaZ = (Math.abs(deltaY) > MAX_ZOOM_STEP ? MAX_ZOOM_STEP * Math.sign(deltaY) : deltaY) / 100
	} else {
		if (event.shiftKey && !tlenv.isDarwin && !tlenv.isIos) {
			deltaX = deltaY
			deltaY = 0
		}
	}

	return { x: -deltaX, y: -deltaY, z: -deltaZ }
}
