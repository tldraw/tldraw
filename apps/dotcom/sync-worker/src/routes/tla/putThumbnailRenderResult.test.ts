import { IRequest } from 'itty-router'
import { describe, expect, it } from 'vitest'
import { Environment } from '../../types'
import { ThumbnailRenderJob, mintThumbnailRenderToken } from '../../utils/renderTokens'
import { putThumbnailRenderResult } from './putThumbnailRenderResult'
import { makeScreenshotTestEnv } from './screenshotTestHelpers'

function makeRequest(body: unknown): IRequest {
	return { json: async () => body } as unknown as IRequest
}

const JOB: ThumbnailRenderJob = {
	v: 1,
	kind: 'published',
	slug: 'board',
	version: 1,
	access: 'public',
	surface: 'mcp',
	camera: 'content',
	x: 0,
	y: 0,
	z: 1,
	width: 1200,
	height: 630,
	theme: 'light',
	exp: Date.now() + 60_000,
}

const TIMINGS = {
	source: 'push',
	bootAt: 100,
	dataAt: 150,
	mountAt: 900,
	settledAt: 1400,
	exportedAt: 2100,
}

describe('the timing beacon', () => {
	it('writes one datapoint per beacon, carrying the surface and how the page got its snapshot', async () => {
		const env = makeScreenshotTestEnv() as unknown as Environment
		const token = await mintThumbnailRenderToken(env, JOB)

		const response = await putThumbnailRenderResult(makeRequest({ token, timings: TIMINGS }), env)

		expect(response.status).toBe(200)
		const calls = (env.MEASURE as any).writeDataPoint.mock.calls
		expect(calls).toHaveLength(1)
		const point = calls[0][0]
		// writeDataPoint prefixes [eventName, workerName]; the beacon's own blobs follow.
		expect(point.blobs[0]).toBe('render_page_timings')
		expect(point.blobs.slice(2)).toEqual(['surface:mcp', 'source:push'])
		expect(point.doubles).toEqual([100, 150, 900, 1400, 2100])
	})

	it('refuses a beacon whose token was not signed by us', async () => {
		const env = makeScreenshotTestEnv() as unknown as Environment
		const other = makeScreenshotTestEnv({
			MCP_SCREENSHOT_TOKEN_SECRET: 'someone-elses-secret',
		}) as unknown as Environment
		const forged = await mintThumbnailRenderToken(other, JOB)

		const response = await putThumbnailRenderResult(
			makeRequest({ token: forged, timings: TIMINGS }),
			env
		)

		expect(response.status).toBe(403)
		expect((env.MEASURE as any).writeDataPoint).not.toHaveBeenCalled()
	})

	it('refuses non-finite stamps rather than polluting the dataset', async () => {
		const env = makeScreenshotTestEnv() as unknown as Environment
		const token = await mintThumbnailRenderToken(env, JOB)

		const response = await putThumbnailRenderResult(
			makeRequest({ token, timings: { ...TIMINGS, settledAt: 'NaN' } }),
			env
		)

		expect(response.status).toBe(400)
		expect((env.MEASURE as any).writeDataPoint).not.toHaveBeenCalled()
	})

	// Valid JSON that is not an object: the endpoint is unauthenticated, so scanners send exactly
	// this, and `'timings' in null` would escape as a worker 500 where a 400 is the answer.
	it.each([null, 42, 'a string'])(
		'refuses the non-object JSON body %j with a 400',
		async (body) => {
			const env = makeScreenshotTestEnv() as unknown as Environment
			const response = await putThumbnailRenderResult(makeRequest(body), env)
			expect(response.status).toBe(400)
		}
	)

	it('refuses timings: null rather than destructuring it', async () => {
		const env = makeScreenshotTestEnv() as unknown as Environment
		const token = await mintThumbnailRenderToken(env, JOB)

		const response = await putThumbnailRenderResult(makeRequest({ token, timings: null }), env)

		expect(response.status).toBe(400)
		expect((env.MEASURE as any).writeDataPoint).not.toHaveBeenCalled()
	})

	it('leaves the measure-result branch alone', async () => {
		const env = makeScreenshotTestEnv() as unknown as Environment
		const token = await mintThumbnailRenderToken(env, { ...JOB, mode: 'measure' })

		const response = await putThumbnailRenderResult(
			makeRequest({ token, bounds: { 'shape:a': { x: 0, y: 0, w: 10, h: 10 } } }),
			env
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ error: false, stored: 1 })
	})
})
