/** @public */
export const EASINGS = {
	linear: (t: number) => t,
	easeInQuad: (t: number) => t * t,
	easeOutQuad: (t: number) => t * (2 - t),
	easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	easeInCubic: (t: number) => t * t * t,
	easeOutCubic: (t: number) => --t * t * t + 1,
	easeInOutCubic: (t: number) =>
		t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
	easeInQuart: (t: number) => t * t * t * t,
	easeOutQuart: (t: number) => 1 - --t * t * t * t,
	easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
	easeInQuint: (t: number) => t * t * t * t * t,
	easeOutQuint: (t: number) => 1 + --t * t * t * t * t,
	easeInOutQuint: (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),
	easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
	easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
	easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
	easeInExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
	easeOutExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
	easeInOutExpo: (t: number) =>
		t <= 0
			? 0
			: t >= 1
			? 1
			: t < 0.5
			? Math.pow(2, 20 * t - 10) / 2
			: (2 - Math.pow(2, -20 * t + 10)) / 2,
} as const

/** @public */
export type EasingType = keyof typeof EASINGS
