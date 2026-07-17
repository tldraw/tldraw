import { describe, expect, it, vi } from 'vitest'
import { PerformanceManager } from './PerformanceManager'

function createMockEditor() {
	const listeners: Record<string, ((...args: any[]) => void)[]> = {}
	return {
		on(event: string, handler: (...args: any[]) => void) {
			;(listeners[event] ??= []).push(handler)
		},
		off(event: string, handler: (...args: any[]) => void) {
			const arr = listeners[event]
			if (arr) {
				const idx = arr.indexOf(handler)
				if (idx !== -1) arr.splice(idx, 1)
			}
		},
		emit(event: string, ...args: any[]) {
			for (const handler of listeners[event] ?? []) {
				handler(...args)
			}
		},
		getSelectedShapes: () => [
			{ type: 'geo', id: '1' },
			{ type: 'geo', id: '2' },
			{ type: 'draw', id: '3' },
		],
		getCurrentPageShapeIds: () => ({ size: 10 }),
		getCulledShapes: () => ({ size: 3 }),
		getCamera: () => ({ x: 0, y: 0, z: 1 }),
		getShape: (id: string) => {
			const shapes: Record<string, { type: string }> = {
				'shape:1': { type: 'geo' },
				'shape:2': { type: 'draw' },
				'shape:3': { type: 'geo' },
			}
			return shapes[id]
		},
		getViewportScreenBounds: () => ({ w: 1920, h: 1080 }),
		timers: {
			setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
		},
		_listeners: listeners,
	} as any
}

describe('PerformanceManager', () => {
	describe('listener management', () => {
		it('returns an unsubscribe function from on()', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			const unsub = pm.on('interaction-end', fn)
			expect(typeof unsub).toBe('function')
			unsub()
		})

		it('attaches frame listener lazily when interaction listener subscribes', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			expect(editor._listeners['frame'] ?? []).toHaveLength(0)

			const unsub = pm.on('interaction-end', vi.fn())
			expect(editor._listeners['frame']).toHaveLength(1)

			unsub()
			expect(editor._listeners['frame'] ?? []).toHaveLength(0)
		})

		it('attaches shape listeners lazily', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)

			const unsub = pm.on('shapes-created', vi.fn())
			expect(editor._listeners['created-shapes']).toHaveLength(1)

			unsub()
			expect(editor._listeners['created-shapes'] ?? []).toHaveLength(0)
		})

		it('does not double-attach frame listener', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)

			const unsub1 = pm.on('interaction-end', vi.fn())
			const unsub2 = pm.on('camera-end', vi.fn())
			expect(editor._listeners['frame']).toHaveLength(1)

			unsub1()
			// still one camera-end listener
			expect(editor._listeners['frame']).toHaveLength(1)

			unsub2()
			expect(editor._listeners['frame'] ?? []).toHaveLength(0)
		})
	})

	describe('interaction tracking', () => {
		it('emits interaction-start when notified', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-start', fn)

			pm._notifyInteractionStart('translating', 'select.translating')

			expect(fn).toHaveBeenCalledTimes(1)
			expect(fn.mock.calls[0][0]).toMatchObject({
				name: 'translating',
				path: 'select.translating',
			})
			expect(fn.mock.calls[0][0].timestamp).toBeGreaterThan(0)
		})

		it('emits interaction-end with frame stats', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-end', fn)

			pm._notifyInteractionStart('resizing', 'select.resizing')

			// Simulate frames
			editor.emit('frame', 16)
			editor.emit('frame', 16)
			editor.emit('frame', 32)
			editor.emit('frame', 16)
			editor.emit('frame', 50)

			pm._notifyInteractionEnd()

			expect(fn).toHaveBeenCalledTimes(1)
			const event = fn.mock.calls[0][0]
			expect(event.name).toBe('resizing')
			expect(event.path).toBe('select.resizing')
			expect(event.frameCount).toBe(5)
			expect(event.frameTimes).toEqual([16, 16, 32, 16, 50])
			expect(event.shapeCount).toBe(10)
			expect(event.selectedShapeTypes).toEqual({ geo: 2, draw: 1 })
			expect(event.avgFrameTime).toBe(26)
			expect(event.duration).toBeGreaterThan(0)
		})

		it('does not emit when no listeners', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)

			// Should not throw
			pm._notifyInteractionStart('resizing', 'select.resizing')
			pm._notifyInteractionEnd()
		})

		it('handles end without start gracefully', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-end', fn)

			pm._notifyInteractionEnd()
			expect(fn).not.toHaveBeenCalled()
		})
	})

	describe('camera tracking', () => {
		it('emits camera-start and camera-end', () => {
			vi.useFakeTimers()
			const editor = createMockEditor()
			// Override timers.setTimeout to use fake timers
			editor.timers.setTimeout = (fn: () => void, ms: number) => setTimeout(fn, ms) as any
			const pm = new PerformanceManager(editor)
			const startFn = vi.fn()
			const endFn = vi.fn()
			pm.on('camera-start', startFn)
			pm.on('camera-end', endFn)

			pm._notifyCameraOperation('panning')
			expect(startFn).toHaveBeenCalledTimes(1)
			expect(startFn.mock.calls[0][0].type).toBe('panning')

			// Simulate frames during camera operation
			editor.emit('frame', 16)
			editor.emit('frame', 16)

			// Wait for debounce timeout
			vi.advanceTimersByTime(100)

			expect(endFn).toHaveBeenCalledTimes(1)
			const event = endFn.mock.calls[0][0]
			expect(event.type).toBe('panning')
			expect(event.frameCount).toBe(2)
			expect(event.viewportWidth).toBe(1920)
			expect(event.viewportHeight).toBe(1080)

			vi.useRealTimers()
		})

		it('extends camera session on repeated operations', () => {
			vi.useFakeTimers()
			const editor = createMockEditor()
			editor.timers.setTimeout = (fn: () => void, ms: number) => setTimeout(fn, ms) as any
			const pm = new PerformanceManager(editor)
			const endFn = vi.fn()
			pm.on('camera-end', endFn)

			pm._notifyCameraOperation('panning')
			editor.emit('frame', 16)
			vi.advanceTimersByTime(30)

			pm._notifyCameraOperation('panning')
			editor.emit('frame', 16)
			vi.advanceTimersByTime(30)

			// Should not have ended yet
			expect(endFn).not.toHaveBeenCalled()

			vi.advanceTimersByTime(100)
			expect(endFn).toHaveBeenCalledTimes(1)
			expect(endFn.mock.calls[0][0].frameCount).toBe(2)

			vi.useRealTimers()
		})

		it('ends old session and starts new on type change', () => {
			vi.useFakeTimers()
			const editor = createMockEditor()
			editor.timers.setTimeout = (fn: () => void, ms: number) => setTimeout(fn, ms) as any
			const pm = new PerformanceManager(editor)
			const startFn = vi.fn()
			const endFn = vi.fn()
			pm.on('camera-start', startFn)
			pm.on('camera-end', endFn)

			pm._notifyCameraOperation('panning')
			editor.emit('frame', 16)

			pm._notifyCameraOperation('zooming')
			// Panning session should have ended
			expect(endFn).toHaveBeenCalledTimes(1)
			expect(endFn.mock.calls[0][0].type).toBe('panning')
			// Zooming session should have started
			expect(startFn).toHaveBeenCalledTimes(2)

			vi.advanceTimersByTime(100)
			expect(endFn).toHaveBeenCalledTimes(2)
			expect(endFn.mock.calls[1][0].type).toBe('zooming')

			vi.useRealTimers()
		})
	})

	describe('frame time stats', () => {
		it('computes correct percentiles', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-end', fn)

			pm._notifyInteractionStart('translating', 'select.translating')

			// 10 frames: 10, 11, 12, 13, 14, 15, 16, 17, 18, 100
			for (let i = 10; i <= 18; i++) editor.emit('frame', i)
			editor.emit('frame', 100)

			pm._notifyInteractionEnd()

			const event = fn.mock.calls[0][0]
			expect(event.minFrameTime).toBe(10)
			expect(event.maxFrameTime).toBe(100)
			expect(event.medianFrameTime).toBe(14)
		})

		it('handles single frame', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-end', fn)

			pm._notifyInteractionStart('translating', 'select.translating')
			editor.emit('frame', 42)
			pm._notifyInteractionEnd()

			const event = fn.mock.calls[0][0]
			expect(event.avgFrameTime).toBe(42)
			expect(event.medianFrameTime).toBe(42)
			expect(event.p95FrameTime).toBe(42)
			expect(event.p99FrameTime).toBe(42)
			expect(event.minFrameTime).toBe(42)
			expect(event.maxFrameTime).toBe(42)
		})

		it('handles zero frames', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-end', fn)

			pm._notifyInteractionStart('translating', 'select.translating')
			pm._notifyInteractionEnd()

			const event = fn.mock.calls[0][0]
			expect(event.avgFrameTime).toBe(0)
			expect(event.frameCount).toBe(0)
		})
	})

	describe('undo/redo tracking', () => {
		it('emits undo events', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('undo', fn)

			pm._notifyUndoRedo('undo', 5, 2)

			expect(fn).toHaveBeenCalledWith({ type: 'undo', undoDepth: 5, redoDepth: 2 })
		})

		it('emits redo events', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('redo', fn)

			pm._notifyUndoRedo('redo', 4, 3)

			expect(fn).toHaveBeenCalledWith({ type: 'redo', undoDepth: 4, redoDepth: 3 })
		})

		it('skips when no listeners', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			// Should not throw
			pm._notifyUndoRedo('undo', 1, 0)
		})
	})

	describe('shape operation tracking', () => {
		it('emits shapes-created events', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('shapes-created', fn)

			editor.emit('created-shapes', [
				{ typeName: 'shape', type: 'geo' },
				{ typeName: 'shape', type: 'geo' },
				{ typeName: 'shape', type: 'draw' },
			])

			expect(fn).toHaveBeenCalledTimes(1)
			expect(fn.mock.calls[0][0]).toMatchObject({
				operation: 'create',
				count: 3,
				shapeTypes: { geo: 2, draw: 1 },
			})
		})

		it('ignores non-shape records', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('shapes-created', fn)

			editor.emit('created-shapes', [{ typeName: 'page', type: 'page' }])

			expect(fn).not.toHaveBeenCalled()
		})

		it('emits shapes-deleted with shape types', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('shapes-deleted', fn)

			editor.emit('deleted-shapes', ['shape:1', 'shape:2'])

			expect(fn).toHaveBeenCalledTimes(1)
			expect(fn.mock.calls[0][0]).toMatchObject({
				operation: 'delete',
				count: 2,
				shapeTypes: { geo: 1, draw: 1 },
			})
		})
	})

	describe('frame event', () => {
		it('emits frame events with shape counts', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('frame', fn)

			editor.emit('frame', 16)

			expect(fn).toHaveBeenCalledWith({
				elapsed: 16,
				shapeCount: 10,
				culledShapeCount: 3,
				visibleShapeCount: 7,
			})
		})
	})

	describe('once()', () => {
		it('fires callback only once', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.once('interaction-start', fn)

			pm._notifyInteractionStart('resizing', 'select.resizing')
			pm._notifyInteractionEnd()
			pm._notifyInteractionStart('resizing', 'select.resizing')

			expect(fn).toHaveBeenCalledTimes(1)
		})

		it('detaches frame listener after once fires', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)

			pm.once('interaction-start', vi.fn())
			expect(editor._listeners['frame']).toHaveLength(1)

			pm._notifyInteractionStart('resizing', 'select.resizing')
			// frame listener should be detached after once fires
			expect(editor._listeners['frame'] ?? []).toHaveLength(0)
		})
	})

	describe('LoAF integration', () => {
		it('attaches LoAF entries to interaction-end events', () => {
			let observerCallback: ((list: any) => void) | null = null
			const mockDisconnect = vi.fn()

			const origPO = globalThis.PerformanceObserver
			globalThis.PerformanceObserver = class MockPO {
				constructor(cb: (list: any) => void) {
					observerCallback = cb
				}
				observe() {}
				disconnect = mockDisconnect
				static supportedEntryTypes = ['long-animation-frame']
			} as any

			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-end', fn)

			pm._notifyInteractionStart('resizing', 'select.resizing')
			editor.emit('frame', 16)

			// Simulate a LoAF entry
			observerCallback!({
				getEntries: () => [
					{
						startTime: 100,
						duration: 80,
						blockingDuration: 60,
						scripts: [{ sourceURL: 'app.js', invoker: 'onPointerMove', duration: 55 }],
					},
				],
			})

			editor.emit('frame', 16)
			pm._notifyInteractionEnd()

			expect(fn).toHaveBeenCalledTimes(1)
			const event = fn.mock.calls[0][0]
			expect(event.longAnimationFrames).toHaveLength(1)
			expect(event.longAnimationFrames[0]).toEqual({
				startTime: 100,
				duration: 80,
				blockingDuration: 60,
				scripts: [{ sourceURL: 'app.js', invoker: 'onPointerMove', duration: 55 }],
			})

			// Cleanup
			pm.on('interaction-end', vi.fn())() // subscribe + unsub to trigger detach check
			globalThis.PerformanceObserver = origPO
		})

		it('omits longAnimationFrames when none collected', () => {
			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)
			const fn = vi.fn()
			pm.on('interaction-end', fn)

			pm._notifyInteractionStart('resizing', 'select.resizing')
			editor.emit('frame', 16)
			pm._notifyInteractionEnd()

			expect(fn.mock.calls[0][0].longAnimationFrames).toBeUndefined()
		})

		it('starts LoAF observer only when interaction-end or camera-end listeners exist', () => {
			const origPO = globalThis.PerformanceObserver
			const mockObserve = vi.fn()
			globalThis.PerformanceObserver = class MockPO {
				constructor(_cb: any) {}
				observe = mockObserve
				disconnect = vi.fn()
				static supportedEntryTypes = ['long-animation-frame']
			} as any

			const editor = createMockEditor()
			const pm = new PerformanceManager(editor)

			// interaction-start alone should NOT start LoAF observer
			const unsub1 = pm.on('interaction-start', vi.fn())
			expect(mockObserve).not.toHaveBeenCalled()
			unsub1()

			// interaction-end should start LoAF observer
			const unsub2 = pm.on('interaction-end', vi.fn())
			expect(mockObserve).toHaveBeenCalledTimes(1)
			unsub2()

			globalThis.PerformanceObserver = origPO
		})
	})
})
