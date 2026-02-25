// Breakpoints for portrait, keep in sync with PORTRAIT_BREAKPOINT enum below!
export const PORTRAIT_BREAKPOINTS = [0, 389, 436, 476, 580, 640, 840, 1023]

// Mapping for above array -- needs to be kept in sync!
/** @public */
export const PORTRAIT_BREAKPOINT = {
	ZERO: 0,
	MOBILE_XXS: 1,
	MOBILE_XS: 2,
	MOBILE_SM: 3,
	MOBILE: 4,
	TABLET_SM: 5,
	TABLET: 6,
	DESKTOP: 7,
} as const
/** @public */
export type PORTRAIT_BREAKPOINT = (typeof PORTRAIT_BREAKPOINT)[keyof typeof PORTRAIT_BREAKPOINT]
