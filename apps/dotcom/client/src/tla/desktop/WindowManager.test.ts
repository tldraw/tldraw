import {
	closeWindow,
	focusedIdAtom,
	focusWindow,
	minimizeWindow,
	moveWindow,
	openWindow,
	resizeWindow,
	restoreWindow,
	toggleMaximize,
	windowsAtom,
} from './WindowManager'

function reset() {
	windowsAtom.set([])
	focusedIdAtom.set(null)
}

describe('WindowManager', () => {
	beforeEach(reset)

	it('opens a window with the app default size and position', () => {
		const id = openWindow('makereal')
		const win = windowsAtom.get().find((w) => w.id === id)!
		expect(win.appId).toBe('makereal')
		expect(win.w).toBe(980)
		expect(win.h).toBe(660)
		expect(win.minimized).toBe(false)
		expect(win.maximized).toBe(false)
	})

	it('opens maximized when requested and stashes prev bounds', () => {
		const id = openWindow('tldraw', { maximized: true })
		const win = windowsAtom.get().find((w) => w.id === id)!
		expect(win.maximized).toBe(true)
		expect(win.prevBounds).toEqual({ x: 240, y: 80, w: 1100, h: 720 })
	})

	it('returns the existing window id when opening the same app twice', () => {
		const a = openWindow('fairies')
		const b = openWindow('fairies')
		expect(a).toBe(b)
		expect(windowsAtom.get().length).toBe(1)
	})

	it('reopening a minimized window restores and focuses it', () => {
		const id = openWindow('fairies')
		minimizeWindow(id)
		openWindow('fairies')
		const win = windowsAtom.get()[0]
		expect(win.minimized).toBe(false)
	})

	it('focusWindow bumps zIndex above all others', () => {
		const a = openWindow('fairies')
		const b = openWindow('makereal')
		const c = openWindow('computer')
		focusWindow(a)
		const get = (id: string) => windowsAtom.get().find((w) => w.id === id)!
		expect(get(a).zIndex).toBeGreaterThan(get(b).zIndex)
		expect(get(a).zIndex).toBeGreaterThan(get(c).zIndex)
	})

	it('minimize then restore preserves bounds and raises z', () => {
		const a = openWindow('fairies')
		openWindow('makereal') // higher z
		const before = windowsAtom.get().find((w) => w.id === a)!
		const bounds = { x: before.x, y: before.y, w: before.w, h: before.h }
		minimizeWindow(a)
		expect(windowsAtom.get().find((w) => w.id === a)!.minimized).toBe(true)
		restoreWindow(a)
		const after = windowsAtom.get().find((w) => w.id === a)!
		expect(after.minimized).toBe(false)
		expect({ x: after.x, y: after.y, w: after.w, h: after.h }).toEqual(bounds)
		const top = Math.max(...windowsAtom.get().map((w) => w.zIndex))
		expect(after.zIndex).toBe(top)
	})

	it('toggleMaximize stashes and restores bounds', () => {
		const id = openWindow('makereal')
		const before = windowsAtom.get().find((w) => w.id === id)!
		const bounds = { x: before.x, y: before.y, w: before.w, h: before.h }
		toggleMaximize(id)
		expect(windowsAtom.get().find((w) => w.id === id)!.maximized).toBe(true)
		toggleMaximize(id)
		const after = windowsAtom.get().find((w) => w.id === id)!
		expect(after.maximized).toBe(false)
		expect({ x: after.x, y: after.y, w: after.w, h: after.h }).toEqual(bounds)
	})

	it('moveWindow is a no-op when maximized', () => {
		const id = openWindow('tldraw', { maximized: true })
		moveWindow(id, 999, 999)
		const win = windowsAtom.get().find((w) => w.id === id)!
		expect(win.x).toBe(240)
		expect(win.y).toBe(80)
	})

	it('resizeWindow is a no-op when maximized', () => {
		const id = openWindow('tldraw', { maximized: true })
		resizeWindow(id, 100, 100)
		const win = windowsAtom.get().find((w) => w.id === id)!
		expect(win.w).toBe(1100)
		expect(win.h).toBe(720)
	})

	it('closeWindow removes the window', () => {
		const id = openWindow('fairies')
		closeWindow(id)
		expect(windowsAtom.get().find((w) => w.id === id)).toBeUndefined()
	})

	it('openWindow sets focus to the new window', () => {
		const id = openWindow('makereal')
		expect(focusedIdAtom.get()).toBe(id)
	})

	it('focusWindow updates focusedIdAtom', () => {
		const a = openWindow('fairies')
		const b = openWindow('makereal')
		focusWindow(a)
		expect(focusedIdAtom.get()).toBe(a)
		focusWindow(b)
		expect(focusedIdAtom.get()).toBe(b)
	})

	it('closing the focused window releases focus to desktop', () => {
		const id = openWindow('fairies')
		expect(focusedIdAtom.get()).toBe(id)
		closeWindow(id)
		expect(focusedIdAtom.get()).toBe(null)
	})

	it('minimizing the focused window releases focus to desktop', () => {
		const id = openWindow('fairies')
		minimizeWindow(id)
		expect(focusedIdAtom.get()).toBe(null)
	})
})
