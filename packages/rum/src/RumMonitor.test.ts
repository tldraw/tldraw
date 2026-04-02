import { describe, expect, it, vi } from 'vitest'
import { RumMonitor } from './RumMonitor'
import type { RumInteractionMetric, RumSink } from './types'

// Minimal mock editor with just the APIs RumMonitor needs
function createMockEditor(initialPath = 'select.idle') {
	let currentPath = initialPath
	const listeners: Record<string, ((...args: any[]) => void)[]> = {}

	return {
		getPath: () => currentPath,
		setPath: (p: string) => {
			currentPath = p
		},
		getCurrentPageShapeIds: () => ({ size: 10 }),
		getSelectedShapeIds: () => [],
		on: (event: string, handler: (...args: any[]) => void) => {
			;(listeners[event] ??= []).push(handler)
		},
		off: (event: string, handler: (...args: any[]) => void) => {
			const arr = listeners[event]
			if (arr) {
				const idx = arr.indexOf(handler)
				if (idx !== -1) arr.splice(idx, 1)
			}
		},
		emit: (event: string, ...args: any[]) => {
			for (const handler of listeners[event] ?? []) {
				handler(...args)
			}
		},
		_listeners: listeners,
	}
}

function createMockSink(): RumSink & { metrics: RumInteractionMetric[] } {
	const metrics: RumInteractionMetric[] = []
	return {
		metrics,
		send: (batch) => {
			metrics.push(...batch)
		},
		dispose: vi.fn(),
	}
}

describe('RumMonitor', () => {
	it('does not attach listeners when disabled', () => {
		const editor = createMockEditor()
		const rum = new RumMonitor(editor as any, { enabled: false })
		rum.start()
		expect(editor._listeners['tick'] ?? []).toHaveLength(0)
		rum.dispose()
	})

	it('attaches and detaches tick/event listeners', () => {
		const editor = createMockEditor()
		const rum = new RumMonitor(editor as any, { enabled: true, sinks: [] })
		rum.start()
		expect(editor._listeners['tick']).toHaveLength(1)
		expect(editor._listeners['event']).toHaveLength(1)
		rum.dispose()
		expect(editor._listeners['tick']).toHaveLength(0)
		expect(editor._listeners['event']).toHaveLength(0)
	})

	it('collects metrics for a tool-state interaction', () => {
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 0,
		})
		rum.start()

		// Simulate entering a resizing state
		editor.setPath('select.resizing')
		// Simulate several ticks (16ms each = 60fps)
		for (let i = 0; i < 10; i++) {
			editor.emit('tick', 16)
		}

		// Exit back to idle
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		// Flush
		rum.flush()

		expect(sink.metrics).toHaveLength(1)
		expect(sink.metrics[0].operation).toBe('resize')
		expect(sink.metrics[0].totalFrames).toBe(10)
		expect(sink.metrics[0].context.shapeCount).toBe(10)
		expect(sink.metrics[0].context.shapeCountBucket).toBe('0-50')
		expect(sink.metrics[0].apdex).toBe(1) // all frames at 16ms ≤ 16.67

		rum.dispose()
	})

	it('discards interactions shorter than minInteractionDuration', () => {
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 500, // 500ms minimum
		})
		rum.start()

		// Very brief interaction
		editor.setPath('select.resizing')
		editor.emit('tick', 16)
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		rum.flush()
		expect(sink.metrics).toHaveLength(0)

		rum.dispose()
	})

	it('respects sampling rate of 0', () => {
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			sampleRate: 0,
			minInteractionDuration: 0,
		})
		rum.start()

		editor.setPath('select.resizing')
		for (let i = 0; i < 5; i++) editor.emit('tick', 16)
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		rum.flush()
		expect(sink.metrics).toHaveLength(0)

		rum.dispose()
	})

	it('detects wheel-based pan interactions', () => {
		vi.useFakeTimers()
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 0,
		})
		rum.start()

		// Simulate wheel events (pan: no ctrl key)
		const wheelEvent = {
			type: 'wheel' as const,
			name: 'wheel' as const,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
			altKey: false,
			accelKey: false,
			delta: { x: 0, y: -10, z: 0 },
			point: { x: 100, y: 100, z: 0 },
		}

		editor.emit('event', wheelEvent)
		editor.emit('tick', 16)
		editor.emit('event', wheelEvent)
		editor.emit('tick', 16)

		// Wait for idle timeout
		vi.advanceTimersByTime(200)

		rum.flush()
		expect(sink.metrics).toHaveLength(1)
		expect(sink.metrics[0].operation).toBe('pan')

		rum.dispose()
		vi.useRealTimers()
	})

	it('detects wheel-based zoom interactions', () => {
		vi.useFakeTimers()
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 0,
		})
		rum.start()

		const wheelEvent = {
			type: 'wheel' as const,
			name: 'wheel' as const,
			ctrlKey: true,
			metaKey: false,
			shiftKey: false,
			altKey: false,
			accelKey: false,
			delta: { x: 0, y: -10, z: 0 },
			point: { x: 100, y: 100, z: 0 },
		}

		editor.emit('event', wheelEvent)
		editor.emit('tick', 16)

		vi.advanceTimersByTime(200)

		rum.flush()
		expect(sink.metrics).toHaveLength(1)
		expect(sink.metrics[0].operation).toBe('zoom')

		rum.dispose()
		vi.useRealTimers()
	})

	it('computes dropped frames correctly', () => {
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 0,
		})
		rum.start()

		editor.setPath('select.translating')
		// Mix of good and bad frames
		editor.emit('tick', 10) // good
		editor.emit('tick', 16) // good (≤ 16.67)
		editor.emit('tick', 50) // dropped
		editor.emit('tick', 100) // dropped
		editor.emit('tick', 12) // good
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		rum.flush()

		expect(sink.metrics).toHaveLength(1)
		expect(sink.metrics[0].droppedFrames).toBe(2)
		expect(sink.metrics[0].totalFrames).toBe(5)

		rum.dispose()
	})

	it('auto-flushes when buffer reaches maxBufferSize', () => {
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 0,
			maxBufferSize: 2,
		})
		rum.start()

		// First interaction
		editor.setPath('select.resizing')
		for (let i = 0; i < 3; i++) editor.emit('tick', 16)
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		// Second interaction — should trigger auto-flush
		editor.setPath('select.translating')
		for (let i = 0; i < 3; i++) editor.emit('tick', 16)
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		// Should have been auto-flushed (no manual flush needed)
		expect(sink.metrics).toHaveLength(2)

		rum.dispose()
	})

	it('attaches LoAF entries to metrics when observer fires', () => {
		// Mock PerformanceObserver to simulate LoAF support
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
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 0,
		})
		rum.start()

		// Enter a resizing interaction
		editor.setPath('select.resizing')
		editor.emit('tick', 16)

		// Simulate a LoAF entry arriving
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

		editor.emit('tick', 16)

		// Exit interaction
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		rum.flush()

		expect(sink.metrics).toHaveLength(1)
		expect(sink.metrics[0].longAnimationFrames).toHaveLength(1)
		expect(sink.metrics[0].longAnimationFrames![0]).toEqual({
			startTime: 100,
			duration: 80,
			blockingDuration: 60,
			scripts: [{ sourceURL: 'app.js', invoker: 'onPointerMove', duration: 55 }],
		})

		rum.dispose()
		expect(mockDisconnect).toHaveBeenCalled()

		// Restore
		globalThis.PerformanceObserver = origPO
	})

	it('omits longAnimationFrames when no LoAF entries collected', () => {
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, {
			enabled: true,
			sinks: [sink],
			minInteractionDuration: 0,
		})
		rum.start()

		editor.setPath('select.resizing')
		for (let i = 0; i < 5; i++) editor.emit('tick', 16)
		editor.setPath('select.idle')
		editor.emit('tick', 16)

		rum.flush()
		expect(sink.metrics[0].longAnimationFrames).toBeUndefined()

		rum.dispose()
	})

	it('disposes sinks on dispose()', () => {
		const editor = createMockEditor()
		const sink = createMockSink()
		const rum = new RumMonitor(editor as any, { enabled: true, sinks: [sink] })
		rum.start()
		rum.dispose()
		expect(sink.dispose).toHaveBeenCalledOnce()
	})
})
