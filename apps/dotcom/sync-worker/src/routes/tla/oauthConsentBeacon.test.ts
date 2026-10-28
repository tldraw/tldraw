import { IRequest } from 'itty-router'
import { describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { postOAuthConsentBeacon } from './oauthConsentBeacon'

function setup(body: unknown, { json }: { json?(): Promise<unknown> } = {}) {
	const writeDataPoint = vi.fn()
	const env = { MEASURE: { writeDataPoint }, WORKER_NAME: 'test-worker' } as unknown as Environment
	const request = { json: json ?? (async () => body) } as unknown as IRequest
	return { env, request, writeDataPoint }
}

describe('postOAuthConsentBeacon', () => {
	it('writes one mcp_oauth_consent datapoint for a known outcome', async () => {
		const { env, request, writeDataPoint } = setup({ outcome: 'page_shown' })

		const res = await postOAuthConsentBeacon(request, env)

		expect(res.status).toBe(200)
		expect(writeDataPoint).toHaveBeenCalledTimes(1)
		// The event name and worker name are prepended by writeDataPoint; the outcome rides in blobs.
		expect(writeDataPoint.mock.calls[0][0]).toMatchObject({
			blobs: ['mcp_oauth_consent', 'test-worker', 'outcome:page_shown'],
		})
	})

	it('rejects an outcome outside the vocabulary without writing', async () => {
		const { env, request, writeDataPoint } = setup({ outcome: 'something_else' })

		const res = await postOAuthConsentBeacon(request, env)

		expect(res.status).toBe(400)
		expect(writeDataPoint).not.toHaveBeenCalled()
	})

	it('rejects a missing outcome without writing', async () => {
		const { env, request, writeDataPoint } = setup({})

		const res = await postOAuthConsentBeacon(request, env)

		expect(res.status).toBe(400)
		expect(writeDataPoint).not.toHaveBeenCalled()
	})

	it('rejects an invalid JSON body without writing', async () => {
		const { env, request, writeDataPoint } = setup(undefined, {
			json: async () => {
				throw new SyntaxError('bad json')
			},
		})

		const res = await postOAuthConsentBeacon(request, env)

		expect(res.status).toBe(400)
		expect(writeDataPoint).not.toHaveBeenCalled()
	})
})
