import { TLCameraOptions } from './editor/types/misc-types'
import { EASINGS } from './primitives/easings'

/** @internal */
export const DEFAULT_CAMERA_OPTIONS: TLCameraOptions = {
	isLocked: false,
	wheelBehavior: 'pan',
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8],
}

/** @internal */
export const DEFAULT_ANIMATION_OPTIONS = {
	duration: 0,
	easing: EASINGS.easeInOutCubic,
}

/**
 * Negative pointer ids are reserved for internal use.
 *
 * @internal */
export const INTERNAL_POINTER_IDS = {
	CAMERA_MOVE: -10,
} as const

/** @public */
export const SIDES = ['top', 'right', 'bottom', 'left'] as const

export const LEFT_MOUSE_BUTTON = 0
export const RIGHT_MOUSE_BUTTON = 2
export const MIDDLE_MOUSE_BUTTON = 1
export const STYLUS_ERASER_BUTTON = 5

export const ZOOM_TO_FIT_PADDING = 128
