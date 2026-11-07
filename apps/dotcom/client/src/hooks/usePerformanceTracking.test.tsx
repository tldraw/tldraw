import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type Editor, type TLCameraEndPerfEvent, type TLInteractionEndPerfEvent } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type FeatureFlags, getFeatureFlags } from '../tla/utils/featureFlags'
import { trackEvent } from '../utils/analytics'
import { usePerformanceTracking } from './usePerformanceTracking'

vi.mock('../tla/utils/featureFlags', () => ({
	getFeatureFlags: vi.fn(),
}))

vi.mock('../utils/analytics', () => ({
	trackEvent: vi.fn(),
}))

interface PerfListeners {
	'interaction-end'?(event: TLInteractionEndPerfEvent): void
	'camera-end'?(event: TLCameraEndPerfEvent): void
}

const frameStats = {
	duration: 100,
	fps: 60,
	frameCount: 6,
	avgFrameTime: 16.67,
	medianFrameTime: 16,
	p95FrameTime: 18,
	p99FrameTime: 20,
	minFrameTime: 15,
	maxFrameTime: 20,
	frameTimes: [15, 16, 16, 16, 17, 20],
}

const interactionEvent: TLInteractionEndPerfEvent = {
	...frameStats,
	name: 'translating',
	path: 'select.translating',
	shapeCount: 3,
	selectedShapeTypes: { geo: 2 },
	zoomLevel: 1,
	timestamp: 100,
}

const cameraEvent: TLCameraEndPerfEvent = {
	...frameStats,
	type: 'panning',
	shapeCount: 3,
	visibleShapeCount: 2,
	culledShapeCount: 1,
	viewportWidth: 1000,
	viewportHeight: 800,
	zoomLevel: 1,
	timestamp: 100,
}

const roots: Root[] = []
const originalMemoryDescriptor = Object.getOwnPropertyDescriptor(performance, 'memory')
const MB = 1024 * 1024
const memory = {
	usedJSHeapSize: 128 * MB,
	totalJSHeapSize: 256 * MB,
	jsHeapSizeLimit: 512 * MB,
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
	vi.mocked(getFeatureFlags).mockResolvedValue({
		rum_enabled: { enabled: true },
		load_rum: { enabled: false },
		mcp_server_access: { enabled: false },
		version_chain: { enabled: false },
		collections: { enabled: false },
	} satisfies FeatureFlags)
})

afterEach(async () => {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount())
	}
	vi.useRealTimers()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	if (originalMemoryDescriptor) {
		Object.defineProperty(performance, 'memory', originalMemoryDescriptor)
	} else {
		Reflect.deleteProperty(performance, 'memory')
	}
})

function makeEditor() {
	const listeners: PerfListeners = {}
	const editor = {
		performance: {
			on: vi.fn((name: keyof PerfListeners, listener: NonNullable<PerfListeners[typeof name]>) => {
				listeners[name] = listener as never
				return vi.fn()
			}),
		},
		sideEffects: {
			registerAfterChangeHandler: vi.fn(() => vi.fn()),
		},
		getCurrentPageShapeIds: vi.fn(() => new Set()),
		getPages: vi.fn(() => []),
		getZoomLevel: vi.fn(() => 1),
	} as unknown as Editor

	return { editor, listeners }
}

async function mountTracking(editor: Editor) {
	function Harness() {
		const trackPerformance = usePerformanceTracking()
		useEffect(() => trackPerformance(editor), [trackPerformance])
		return null
	}

	const root = createRoot(document.createElement('div'))
	roots.push(root)
	await act(async () => {
		root.render(<Harness />)
		await Promise.resolve()
	})
}

describe('usePerformanceTracking', () => {
	it('does not send sampled-out interaction or camera events', async () => {
		const { editor, listeners } = makeEditor()
		vi.spyOn(Math, 'random').mockReturnValue(0.5)
		await mountTracking(editor)

		listeners['interaction-end']?.(interactionEvent)
		listeners['camera-end']?.(cameraEvent)

		expect(trackEvent).not.toHaveBeenCalled()
	})

	it('marks sampled interaction and camera events with their sample rate', async () => {
		const { editor, listeners } = makeEditor()
		vi.spyOn(Math, 'random').mockReturnValue(0.05)
		await mountTracking(editor)

		listeners['interaction-end']?.(interactionEvent)
		listeners['camera-end']?.(cameraEvent)

		expect(trackEvent).toHaveBeenNthCalledWith(
			1,
			'rum',
			expect.objectContaining({ type: 'interaction', sample_rate: 0.1 })
		)
		expect(trackEvent).toHaveBeenNthCalledWith(
			2,
			'rum',
			expect.objectContaining({ type: 'camera', sample_rate: 0.1 })
		)
	})

	it('takes interval memory samples every five minutes with sampling metadata', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(0)
		Object.defineProperty(performance, 'memory', { configurable: true, value: memory })
		const { editor } = makeEditor()
		await mountTracking(editor)

		await act(async () => vi.advanceTimersByTimeAsync(299_999))
		expect(trackEvent).not.toHaveBeenCalled()

		await act(async () => vi.advanceTimersByTimeAsync(1))
		expect(trackEvent).toHaveBeenCalledWith(
			'rum',
			expect.objectContaining({
				type: 'memory',
				sample_reason: 'interval',
				sample_rate: 1,
				sample_interval_s: 300,
			})
		)
	})
})
