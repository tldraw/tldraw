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

/** @public */
// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace PORTRAIT_BREAKPOINT {
	export type ZERO = typeof PORTRAIT_BREAKPOINT.ZERO
	export type MOBILE_XXS = typeof PORTRAIT_BREAKPOINT.MOBILE_XXS
	export type MOBILE_XS = typeof PORTRAIT_BREAKPOINT.MOBILE_XS
	export type MOBILE_SM = typeof PORTRAIT_BREAKPOINT.MOBILE_SM
	export type MOBILE = typeof PORTRAIT_BREAKPOINT.MOBILE
	export type TABLET_SM = typeof PORTRAIT_BREAKPOINT.TABLET_SM
	export type TABLET = typeof PORTRAIT_BREAKPOINT.TABLET
	export type DESKTOP = typeof PORTRAIT_BREAKPOINT.DESKTOP
}
