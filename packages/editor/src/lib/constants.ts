import { TLCameraOptions } from './editor/types/misc-types'
import { EASINGS } from './primitives/easings'

/** @internal */
export const MAX_SHAPES_PER_PAGE = 4000
/** @internal */
export const MAX_PAGES = 40

/** @internal */
export const ANIMATION_SHORT_MS = 80
/** @internal */
export const ANIMATION_MEDIUM_MS = 320

/** @internal */
export const DEFAULT_CAMERA_OPTIONS: TLCameraOptions = {
	isLocked: false,
	wheelBehavior: 'pan',
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: [0.1, 0.25, 0.5, 1, 2, 4, 8],
}

/** @internal */
export const FOLLOW_CHASE_VIEWPORT_SNAP = 2

/** @internal */
export const DOUBLE_CLICK_DURATION = 450
/** @internal */
export const MULTI_CLICK_DURATION = 200

/** @internal */
export const COARSE_DRAG_DISTANCE = 36 // 6 squared

/** @internal */
export const DRAG_DISTANCE = 16 // 4 squared

/** @internal */
export const SVG_PADDING = 32

/** @internal */
export const DEFAULT_ANIMATION_OPTIONS = {
	duration: 0,
	easing: EASINGS.easeInOutCubic,
}

/** @internal */
export const CAMERA_SLIDE_FRICTION = 0.09

/** @public */
export const GRID_STEPS = [
	{ min: -1, mid: 0.15, step: 64 },
	{ min: 0.05, mid: 0.375, step: 16 },
	{ min: 0.15, mid: 1, step: 4 },
	{ min: 0.7, mid: 2.5, step: 1 },
]

/** @internal */
export const COLLABORATOR_INACTIVE_TIMEOUT = 60000

/** @internal */
export const COLLABORATOR_IDLE_TIMEOUT = 3000

/** @internal */
export const COLLABORATOR_CHECK_INTERVAL = 1200

/**
 * Negative pointer ids are reserved for internal use.
 *
 * @internal */
export const INTERNAL_POINTER_IDS = {
	CAMERA_MOVE: -10,
} as const

/** @internal */
export const CAMERA_MOVING_TIMEOUT = 64

/** @public */
export const HIT_TEST_MARGIN = 8

/** @internal */
export const EDGE_SCROLL_SPEED = 20

/** @internal */
export const EDGE_SCROLL_DISTANCE = 8

/** @internal */
export const COARSE_POINTER_WIDTH = 12

/** @internal */
export const COARSE_HANDLE_RADIUS = 20

/** @internal */
export const HANDLE_RADIUS = 12

/** @public */
export const SIDES = ['top', 'right', 'bottom', 'left'] as const

/** @internal */
export const LONG_PRESS_DURATION = 500

/** @internal */
export const TEXT_SHADOW_LOD = 0.35

export const LEFT_MOUSE_BUTTON = 0
export const RIGHT_MOUSE_BUTTON = 2
export const MIDDLE_MOUSE_BUTTON = 1
export const STYLUS_ERASER_BUTTON = 5

export const ZOOM_TO_FIT_PADDING = 128
