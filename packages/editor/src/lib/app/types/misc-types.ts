/** @public */
export type TLEasingType =
	| 'linear'
	| 'easeInQuad'
	| 'easeOutQuad'
	| 'easeInOutQuad'
	| 'easeInCubic'
	| 'easeOutCubic'
	| 'easeInOutCubic'
	| 'easeInQuart'
	| 'easeOutQuart'
	| 'easeInOutQuart'
	| 'easeInQuint'
	| 'easeOutQuint'
	| 'easeInOutQuint'
	| 'easeInSine'
	| 'easeOutSine'
	| 'easeInOutSine'
	| 'easeInExpo'
	| 'easeOutExpo'
	| 'easeInOutExpo'

/** @public */
export type RequiredKeys<T, K extends keyof T> = Pick<T, K> & Partial<T>
