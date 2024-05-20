// Breakpoints for portrait, keep in sync with PORTRAIT_BREAKPOINT enum below!
export let PORTRAIT_BREAKPOINTS = [0, 390, 428, 468, 580, 640, 840, 1023]

// Mapping for above array -- needs to be kept in sync!
/** @public */
export enum PORTRAIT_BREAKPOINT {
	ZERO = 0,
	MOBILE_XXS = 1,
	MOBILE_XS = 2,
	MOBILE_SM = 3,
	MOBILE = 4,
	TABLET_SM = 5,
	TABLET = 6,
	DESKTOP = 7,
}

export let ADJACENT_SHAPE_MARGIN = 20

export let SHAPES_WHICH_ARROWS_CANNOT_BIND_TO = ['arrow', 'group']

/* ==== Auto generated setters - stuff below this point will be overwritten ==== */
/** @public */
export const DEFAULT_TLDRAW_SETTINGS = {
	PORTRAIT_BREAKPOINTS,
	ADJACENT_SHAPE_MARGIN,
	SHAPES_WHICH_ARROWS_CANNOT_BIND_TO,
} as const
/** @public */
export function getTldrawSettings() {
	return {
		PORTRAIT_BREAKPOINTS,
		ADJACENT_SHAPE_MARGIN,
		SHAPES_WHICH_ARROWS_CANNOT_BIND_TO,
	}
}
/** @public */
export function updateTldrawSettings(settings: {
	PORTRAIT_BREAKPOINTS?: typeof PORTRAIT_BREAKPOINTS
	ADJACENT_SHAPE_MARGIN?: typeof ADJACENT_SHAPE_MARGIN
	SHAPES_WHICH_ARROWS_CANNOT_BIND_TO?: typeof SHAPES_WHICH_ARROWS_CANNOT_BIND_TO
}) {
	if (settings.PORTRAIT_BREAKPOINTS !== undefined) {
		PORTRAIT_BREAKPOINTS = settings.PORTRAIT_BREAKPOINTS
	}
	if (settings.ADJACENT_SHAPE_MARGIN !== undefined) {
		ADJACENT_SHAPE_MARGIN = settings.ADJACENT_SHAPE_MARGIN
	}
	if (settings.SHAPES_WHICH_ARROWS_CANNOT_BIND_TO !== undefined) {
		SHAPES_WHICH_ARROWS_CANNOT_BIND_TO = settings.SHAPES_WHICH_ARROWS_CANNOT_BIND_TO
	}
}
