import { atom } from 'tldraw'

/** A demo comment thread: a page-space anchor plus the bits the pin marker paints. */
export interface DemoThread {
	id: string
	/** Anchor in page coordinates. */
	x: number
	y: number
	color: string
	/** The author initial shown on a single-comment pin. */
	initial: string
	/** Reply count; when > 1 the pin shows the number instead of the initial. */
	count: number
	resolved: boolean
}

/**
 * The demo's comment state, held in signals so the overlay util can read it inside its reactive
 * `getOverlays()` and the React popover can read it via `useValue` — the same source of truth, with
 * no coupling between the canvas-drawn marker and the DOM thread UI.
 */
export const demoThreads = atom<DemoThread[]>('demo comment threads', [])

/** The open thread's id, or null. Set by the pin's `onPointerDown`; read by the popover. */
export const openThreadId = atom<string | null>('open comment thread', null)

export function toggleThreadResolved(id: string) {
	demoThreads.update((threads) =>
		threads.map((thread) => (thread.id === id ? { ...thread, resolved: !thread.resolved } : thread))
	)
}
