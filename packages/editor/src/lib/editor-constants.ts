import { EASINGS } from './primitives/easings'

const MAX_ZOOM = 8
const HASH_PATTERN_ZOOM_NAMES = {} as Record<string, string>
for (let zoom = 1; zoom <= Math.ceil(MAX_ZOOM); zoom++) {
	HASH_PATTERN_ZOOM_NAMES[zoom + '_dark'] = `hash_pattern_zoom_${zoom}_dark`
	HASH_PATTERN_ZOOM_NAMES[zoom + '_light'] = `hash_pattern_zoom_${zoom}_light`
}

/** @public */
export const editorConstants = {
	MAX_CLICK_DISTANCE: 40,
	MAX_SHAPES_PER_PAGE: 2000,
	MAX_PAGES: 40,
	ANIMATION_SHORT_MS: 80,
	ANIMATION_MEDIUM_MS: 320,
	ZOOMS: [0.1, 0.25, 0.5, 1, 2, 4, 8],
	MIN_ZOOM: 0.1,
	MAX_ZOOM,
	HASH_PATTERN_ZOOM_NAMES,
	FOLLOW_CHASE_PROPORTION: 0.5,
	FOLLOW_CHASE_PAN_SNAP: 0.1,
	FOLLOW_CHASE_PAN_UNSNAP: 0.2,
	FOLLOW_CHASE_ZOOM_SNAP: 0.005,
	FOLLOW_CHASE_ZOOM_UNSNAP: 0.05,
	DOUBLE_CLICK_DURATION: 450,
	MULTI_CLICK_DURATION: 200,
	COARSE_DRAG_DISTANCE: 36, // 6 squared
	DRAG_DISTANCE: 16, // 4 squared
	SVG_PADDING: 32,
	DEFAULT_ANIMATION_OPTIONS: { duration: 0, easing: EASINGS.easeInOutCubic },
	CAMERA_SLIDE_FRICTION: 0.09,
	GRID_STEPS: [
		{ min: -1, mid: 0.15, step: 64 },
		{ min: 0.05, mid: 0.375, step: 16 },
		{ min: 0.15, mid: 1, step: 4 },
		{ min: 0.7, mid: 2.5, step: 1 },
	],
	COLLABORATOR_INACTIVE_TIMEOUT: 60000,
	COLLABORATOR_IDLE_TIMEOUT: 3000,
	COLLABORATOR_CHECK_INTERVAL: 1200,
	CAMERA_MOVING_TIMEOUT: 64,
	HIT_TEST_MARGIN: 8,
	EDGE_SCROLL_SPEED: 20,
	EDGE_SCROLL_DISTANCE: 8,
	COARSE_POINTER_WIDTH: 12,
	COARSE_HANDLE_RADIUS: 20,
	HANDLE_RADIUS: 12,
	LONG_PRESS_DURATION: 500,
	TEXT_SHADOW_LOD: 0.35,
	MIN_ARROW_LENGTH: 10,
	BOUND_ARROW_OFFSET: 10,
	WAY_TOO_BIG_ARROW_BEND_FACTOR: 10,
	DUPLICATE_DISTANCE: 20,
	STROKE_SIZES: {
		s: 2,
		m: 3.5,
		l: 5,
		xl: 10,
	},
	SIDES: ['top', 'right', 'bottom', 'left'] as const,
	ROTATE_CORNER_TO_SELECTION_CORNER: {
		top_left_rotate: 'top_left',
		top_right_rotate: 'top_right',
		bottom_right_rotate: 'bottom_right',
		bottom_left_rotate: 'bottom_left',
		mobile_rotate: 'top_left',
	} as const,
	// Negative pointer ids are reserved for internal use.
	INTERNAL_POINTER_IDS: { CAMERA_MOVE: -10 } as const,
}
