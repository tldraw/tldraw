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

export interface CameraFocusPoint {
	/** X position to center on */
	x: number
	/** Y position to center on */
	y: number
	/** Zoom level (1 = 100%) */
	z: number
	/** When to arrive at this position, as a fraction of slide duration (0–1) */
	at: number
}

export interface TldrawSlide {
	type: 'tldraw'
	/** TLStoreSnapshot JSON to load into the editor */
	snapshot: unknown
	/** Camera animation keyframes. If omitted, uses the camera from the snapshot. */
	camera?: CameraFocusPoint[]
	/** Whether to show the UI chrome (default: false) */
	showUi?: boolean
	audio: string
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
	| TldrawSlide
	| OutroSlide

export interface Manifest {
	pr: number
	slides: Slide[]
}
