/** Easing function: maps progress [0,1] → eased value [0,1] */
export type EasingFn = (t: number) => number

/** Pressure simulation options */
export interface PressureOptions {
	/** Base pressure level (0–1, default: 0.5) */
	basePressure: number
	/** Amplitude of pressure variation (default: 0.15) */
	pressureVariation: number
	/** Frequency of pressure oscillation — higher = more frequent changes (default: 0.08) */
	pressureFrequency: number
	/** Random seed for deterministic phase offsets (default: 42) */
	seed: number
}

/** Options for path animation */
export interface AnimationOptions {
	/** Total animation duration in milliseconds (default: 3000) */
	duration: number
	/** Easing function for animation progress (default: easeInOutCubic) */
	easing: EasingFn
	/** Pressure simulation options */
	pressure: PressureOptions
	/** Draw segment type (default: 'free') */
	segmentType: 'free' | 'straight'
	/** Shape color (default: 'red') */
	color: string
	/** Called each frame with current progress 0–1 */
	onProgress?: (progress: number) => void
	/** Called when animation completes */
	onComplete?: () => void
}

/** Default pressure options */
export const DEFAULT_PRESSURE_OPTIONS: PressureOptions = {
	basePressure: 0.5,
	pressureVariation: 0.15,
	pressureFrequency: 0.08,
	seed: 42,
}

/** Default animation options (easing filled in at runtime to avoid circular dep) */
export const DEFAULT_ANIMATION_OPTIONS: Omit<AnimationOptions, 'easing'> = {
	duration: 3000,
	pressure: DEFAULT_PRESSURE_OPTIONS,
	segmentType: 'free',
	color: 'red',
}
