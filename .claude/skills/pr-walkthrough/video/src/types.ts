export interface IntroSlide {
	type: 'intro'
	title: string
	date: string
	audio: string
	durationInSeconds: number
}

export interface FocusPoint {
	/** Diff/code line number to center on screen (0-indexed into parsed lines) */
	line: number
	/** When to arrive at this focus point, as a fraction of slide duration (0–1) */
	at: number
}

export interface DiffSlide {
	type: 'diff'
	/** Optional segment label displayed above the filename */
	title?: string
	filename: string
	language: string
	diff: string
	/** Optional focus points for animated scroll. If omitted, auto-fits or starts at top. */
	focus?: FocusPoint[]
	audio: string
	durationInSeconds: number
}

export interface CodeSlide {
	type: 'code'
	/** Optional segment label displayed above the filename */
	title?: string
	filename: string
	language: string
	code: string
	/** Optional focus points for animated scroll. If omitted, auto-fits or starts at top. */
	focus?: FocusPoint[]
	audio: string
	durationInSeconds: number
}

export interface TextSlide {
	type: 'text'
	title: string
	subtitle?: string
	audio: string
	durationInSeconds: number
}

export interface ListSlide {
	type: 'list'
	title: string
	items: string[]
	audio: string
	durationInSeconds: number
}

export interface ImageSlide {
	type: 'image'
	src: string
	audio: string
	durationInSeconds: number
}

export interface SegmentSlide {
	type: 'segment'
	title: string
	durationInSeconds: number
}

export interface OutroSlide {
	type: 'outro'
	durationInSeconds: number
}

export type Slide =
	| IntroSlide
	| DiffSlide
	| CodeSlide
	| TextSlide
	| ListSlide
	| ImageSlide
	| SegmentSlide
	| OutroSlide

export interface Manifest {
	pr: number
	slides: Slide[]
}
