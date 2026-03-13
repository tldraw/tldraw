import { EasingFn } from './types'

/** Linear — no easing */
export const linear: EasingFn = (t) => t

/** Ease in (quadratic) */
export const easeInQuad: EasingFn = (t) => t * t

/** Ease out (quadratic) */
export const easeOutQuad: EasingFn = (t) => t * (2 - t)

/** Ease in-out (quadratic) */
export const easeInOutQuad: EasingFn = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

/** Ease in (cubic) */
export const easeInCubic: EasingFn = (t) => t * t * t

/** Ease out (cubic) */
export const easeOutCubic: EasingFn = (t) => --t * t * t + 1

/** Ease in-out (cubic) */
export const easeInOutCubic: EasingFn = (t) =>
	t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1

/** Ease in (quartic) */
export const easeInQuart: EasingFn = (t) => t * t * t * t

/** Ease out (quartic) */
export const easeOutQuart: EasingFn = (t) => 1 - --t * t * t * t

/** Ease in-out (quartic) */
export const easeInOutQuart: EasingFn = (t) =>
	t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t

/** Ease in (sinusoidal) */
export const easeInSine: EasingFn = (t) => 1 - Math.cos((t * Math.PI) / 2)

/** Ease out (sinusoidal) */
export const easeOutSine: EasingFn = (t) => Math.sin((t * Math.PI) / 2)

/** Ease in-out (sinusoidal) */
export const easeInOutSine: EasingFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2

/** Named easing functions for UI selection */
export const EASING_FUNCTIONS: Record<string, EasingFn> = {
	linear,
	easeInQuad,
	easeOutQuad,
	easeInOutQuad,
	easeInCubic,
	easeOutCubic,
	easeInOutCubic,
	easeInQuart,
	easeOutQuart,
	easeInOutQuart,
	easeInSine,
	easeOutSine,
	easeInOutSine,
}
