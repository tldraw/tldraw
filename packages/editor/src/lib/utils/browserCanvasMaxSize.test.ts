import { vi } from 'vitest'

// The module caches the probed sizes for the whole session, so every test gets a fresh copy.
async function loadModule() {
	vi.resetModules()
	return await import('./browserCanvasMaxSize')
}

// Simulates a browser whose canvases silently fail above the given limits: a probe passes only
// when the test canvas fits, which the implementation detects by reading back a painted pixel.
function mockCanvasLimits({ maxDimension, maxArea }: { maxDimension: number; maxArea: number }) {
	let lastTestCanvas: HTMLCanvasElement | undefined
	const getContext = vi
		.spyOn(HTMLCanvasElement.prototype, 'getContext')
		.mockImplementation(function (this: HTMLCanvasElement) {
			return {
				fillRect: vi.fn(),
				drawImage: vi.fn((source: HTMLCanvasElement) => {
					lastTestCanvas = source
				}),
				getImageData: vi.fn(() => {
					const cvs = lastTestCanvas!
					const passes =
						cvs.width <= maxDimension &&
						cvs.height <= maxDimension &&
						cvs.width * cvs.height <= maxArea
					return { data: new Uint8ClampedArray([0, 0, 0, passes ? 255 : 0]) }
				}),
			} as unknown as CanvasRenderingContext2D
		})
	return getContext
}

describe('clampToBrowserMaxCanvasSize', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('returns safe sizes unchanged without probing the browser', async () => {
		const getContext = mockCanvasLimits({ maxDimension: 16384, maxArea: 8192 * 8192 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		expect(clampToBrowserMaxCanvasSize(100, 50)).toEqual([100, 50])
		expect(clampToBrowserMaxCanvasSize(8192, 2048)).toEqual([8192, 2048])
		expect(clampToBrowserMaxCanvasSize(4096, 4096)).toEqual([4096, 4096])
		expect(getContext).not.toHaveBeenCalled()
	})

	it('probes the browser once the safe limits are exceeded', async () => {
		const getContext = mockCanvasLimits({ maxDimension: 16384, maxArea: 8192 * 8192 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		clampToBrowserMaxCanvasSize(9000, 100)
		expect(getContext).toHaveBeenCalled()
	})

	it('clamps width first, then scales down to fit the max area while keeping the aspect ratio', async () => {
		mockCanvasLimits({ maxDimension: 16384, maxArea: 8192 * 8192 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		const [w, h] = clampToBrowserMaxCanvasSize(20000, 10000)
		expect(w / h).toBeCloseTo(2)
		expect(w * h).toBeCloseTo(8192 * 8192)
		expect(w).toBeCloseTo(16384 / Math.SQRT2)
		expect(h).toBeCloseTo(8192 / Math.SQRT2)
	})

	it('clamps height for tall images', async () => {
		mockCanvasLimits({ maxDimension: 16384, maxArea: 8192 * 8192 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		const [w, h] = clampToBrowserMaxCanvasSize(10000, 20000)
		expect(w / h).toBeCloseTo(0.5)
		expect(w).toBeCloseTo(8192 / Math.SQRT2)
		expect(h).toBeCloseTo(16384 / Math.SQRT2)
	})

	it('only scales by area when both dimensions fit', async () => {
		mockCanvasLimits({ maxDimension: 16384, maxArea: 8192 * 8192 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		const [w, h] = clampToBrowserMaxCanvasSize(10000, 10000)
		expect(w).toBeCloseTo(8192)
		expect(h).toBeCloseTo(8192)
	})

	it('keeps sizes the browser can actually handle', async () => {
		mockCanvasLimits({ maxDimension: 32767, maxArea: 16384 * 16384 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		expect(clampToBrowserMaxCanvasSize(10000, 9000)).toEqual([10000, 9000])
		expect(clampToBrowserMaxCanvasSize(30000, 100)).toEqual([30000, 100])
	})

	it('caches the probed limits across calls', async () => {
		const getContext = mockCanvasLimits({ maxDimension: 16384, maxArea: 8192 * 8192 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		clampToBrowserMaxCanvasSize(9000, 100)
		const callsAfterFirst = getContext.mock.calls.length
		clampToBrowserMaxCanvasSize(100, 9000)
		clampToBrowserMaxCanvasSize(9000, 9000)
		expect(getContext.mock.calls.length).toBe(callsAfterFirst)
	})

	it('throws when the browser rejects every candidate size', async () => {
		mockCanvasLimits({ maxDimension: 1, maxArea: 1 })
		const { clampToBrowserMaxCanvasSize } = await loadModule()

		expect(() => clampToBrowserMaxCanvasSize(9000, 100)).toThrow(
			'Failed to determine maximum canvas dimension'
		)
	})
})
