import { afterEach, describe, expect, it, vi } from 'vitest'
import { RenderContentSummary, RenderPayload } from './api'
import { compareScreenshotInShadow, HeadlessCompareResult } from './headlessShadow'
import { Environment } from './types'

const payload = {
	records: [],
	renderParams: { width: 1200, height: 630 },
} as unknown as RenderPayload
const content: RenderContentSummary = {
	records: 10,
	pageShapes: 4,
	mediaAssets: 1,
	bboxWidth: 800,
	bboxHeight: 400,
	imageMegapixels: 2.5,
}
const png = new Uint8Array([1, 2, 3])

function setup(compare: (request: unknown) => Promise<HeadlessCompareResult>) {
	const writeDataPoint = vi.fn()
	const compareSpy = vi.fn(compare)
	const env = {
		WORKER_NAME: 'staging-tldraw-render-worker',
		MEASURE: { writeDataPoint },
		HEADLESS_WORKER: { compare: compareSpy },
	} as unknown as Environment
	return { env, compareSpy, rows: () => writeDataPoint.mock.calls.map(([row]) => row) }
}

afterEach(() => {
	vi.useRealTimers()
})

describe('compareScreenshotInShadow', () => {
	it('sends the browser PNG and records the diff with both timings and the content', async () => {
		const { env, compareSpy, rows } = setup(async () => ({
			ok: true,
			diff: { fair: 0.0015, strict: 0.04 },
		}))
		await compareScreenshotInShadow(env, { payload, content }, { ok: true, png, browserMs: 750 })

		expect(compareSpy).toHaveBeenCalledWith({ payload, reference: png })
		const [row] = rows()
		expect(row.blobs).toEqual([
			'render_shadow_compare',
			'staging-tldraw-render-worker',
			'op:screenshot',
			'reference:browser_run',
			'outcome:ok',
			'browser:ok',
			'headless:ok',
		])
		expect(row.doubles).toEqual([0.0015, 0.04, 750, expect.any(Number), 10, 4, 1, 2.5])
	})

	it('still asks headless to draw when the browser failed, without a reference', async () => {
		const { env, compareSpy, rows } = setup(async () => ({ ok: true, diff: null }))
		await compareScreenshotInShadow(
			env,
			{ payload, content },
			{ ok: false, reason: 'browser_timeout', browserMs: 45_000 }
		)

		expect(compareSpy).toHaveBeenCalledWith({ payload, reference: undefined })
		expect(rows()[0].blobs.slice(4)).toEqual([
			'outcome:browser_failed',
			'browser:browser_timeout',
			'headless:ok',
		])
		expect(rows()[0].doubles.slice(0, 3)).toEqual([-1, -1, 45_000])
	})

	it('records a headless refusal by its reason', async () => {
		const { env, rows } = setup(async () => ({ ok: false, reason: 'page_error' }))
		await compareScreenshotInShadow(env, { payload, content }, { ok: true, png, browserMs: 700 })
		expect(rows()[0].blobs.slice(4)).toEqual([
			'outcome:headless_failed',
			'browser:ok',
			'headless:page_error',
		])
	})

	it('records an RPC that throws as a failed compare, not a headless failure', async () => {
		const { env, rows } = setup(async () => {
			throw new Error('worker exploded')
		})
		vi.spyOn(console, 'error').mockImplementation(() => {})
		await expect(
			compareScreenshotInShadow(env, { payload, content }, { ok: true, png, browserMs: 700 })
		).resolves.toBeUndefined()
		expect(rows()[0].blobs.slice(4)).toEqual([
			'outcome:compare_failed',
			'browser:ok',
			'headless:rpc_error',
		])
	})

	it('gives up on a compare that never answers', async () => {
		vi.useFakeTimers()
		const { env, rows } = setup(() => new Promise(() => {}))
		const done = compareScreenshotInShadow(
			env,
			{ payload, content },
			{ ok: false, reason: 'browser_failed', browserMs: 10 }
		)
		await vi.advanceTimersByTimeAsync(20_000)
		await done
		expect(rows()[0].blobs.slice(4)).toEqual([
			'outcome:both_failed',
			'browser:browser_failed',
			'headless:timeout',
		])
	})

	it('does nothing where the headless worker is unbound', async () => {
		const writeDataPoint = vi.fn()
		const env = { MEASURE: { writeDataPoint } } as unknown as Environment
		await compareScreenshotInShadow(env, { payload, content }, { ok: true, png, browserMs: 700 })
		expect(writeDataPoint).not.toHaveBeenCalled()
	})
})
