import { atom, uniqueId } from 'tldraw'
import { AppId, apps } from './apps'

export interface WindowBounds {
	x: number
	y: number
	w: number
	h: number
}

export interface WindowState extends WindowBounds {
	id: string
	appId: AppId
	zIndex: number
	minimized: boolean
	maximized: boolean
	// Pre-maximize/pre-minimize bounds, so restore puts the window back.
	prevBounds: WindowBounds | null
}

export const windowsAtom = atom<WindowState[]>('desktop:windows', [])

// Tracks which window currently "owns" the menu bar, macOS-style. null
// means the desktop is focused (and the marketing menu is shown). This
// is decoupled from z-index: clicking the desktop releases focus
// without disturbing window stacking.
export const focusedIdAtom = atom<string | null>('desktop:focused', null)

export function focusDesktop() {
	focusedIdAtom.set(null)
}

function topZ(windows: WindowState[]) {
	return windows.reduce((m, w) => Math.max(m, w.zIndex), 0)
}

function replaceWindow(id: string, fn: (w: WindowState) => WindowState) {
	const prev = windowsAtom.get()
	const next = prev.map((w) => (w.id === id ? fn(w) : w))
	windowsAtom.set(next)
}

export function openWindow(appId: AppId, opts: { maximized?: boolean } = {}): string {
	const prev = windowsAtom.get()

	// If a window for this app already exists, focus and unminimize it
	// instead of opening a duplicate. Single instance per app keeps the
	// model simple and matches user expectation.
	const existing = prev.find((w) => w.appId === appId)
	if (existing) {
		if (existing.minimized) restoreWindow(existing.id)
		focusWindow(existing.id)
		return existing.id
	}

	const app = apps[appId]
	const id = uniqueId()
	const z = topZ(prev) + 1
	const bounds: WindowBounds = {
		x: app.defaultPosition.x,
		y: app.defaultPosition.y,
		w: app.defaultSize.w,
		h: app.defaultSize.h,
	}
	const win: WindowState = {
		id,
		appId,
		...bounds,
		zIndex: z,
		minimized: false,
		maximized: !!opts.maximized,
		prevBounds: opts.maximized ? bounds : null,
	}
	windowsAtom.set([...prev, win])
	focusedIdAtom.set(id)
	return id
}

export function closeWindow(id: string) {
	windowsAtom.set(windowsAtom.get().filter((w) => w.id !== id))
	if (focusedIdAtom.get() === id) focusedIdAtom.set(null)
}

export function focusWindow(id: string) {
	const prev = windowsAtom.get()
	const target = prev.find((w) => w.id === id)
	if (!target) return
	focusedIdAtom.set(id)
	const top = topZ(prev)
	if (target.zIndex === top && !target.minimized) return
	replaceWindow(id, (w) => ({ ...w, zIndex: top + 1 }))
}

export function minimizeWindow(id: string) {
	replaceWindow(id, (w) => (w.minimized ? w : { ...w, minimized: true }))
	if (focusedIdAtom.get() === id) focusedIdAtom.set(null)
}

export function restoreWindow(id: string) {
	const prev = windowsAtom.get()
	const target = prev.find((w) => w.id === id)
	if (!target) return
	const top = topZ(prev)
	replaceWindow(id, (w) => ({ ...w, minimized: false, zIndex: top + 1 }))
}

export function toggleMaximize(id: string) {
	replaceWindow(id, (w) => {
		if (w.maximized && w.prevBounds) {
			return {
				...w,
				maximized: false,
				x: w.prevBounds.x,
				y: w.prevBounds.y,
				w: w.prevBounds.w,
				h: w.prevBounds.h,
				prevBounds: null,
			}
		}
		return {
			...w,
			maximized: true,
			prevBounds: { x: w.x, y: w.y, w: w.w, h: w.h },
		}
	})
}

export function moveWindow(id: string, x: number, y: number) {
	replaceWindow(id, (w) => (w.maximized ? w : { ...w, x, y }))
}

export function resizeWindow(id: string, w: number, h: number) {
	replaceWindow(id, (win) => (win.maximized ? win : { ...win, w, h }))
}
