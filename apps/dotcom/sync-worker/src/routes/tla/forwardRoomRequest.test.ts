import { IRequest } from 'itty-router'
import { describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { forwardRoomRequest } from './forwardRoomRequest'

function makeEnv(fetchImpl: (req: Request) => Promise<Response>) {
	const fetch = vi.fn(fetchImpl)
	const writeDataPoint = vi.fn()
	const env = {
		TLDR_DOC: {
			idFromName: () => 'fake-do-id',
			get: () => ({ fetch }),
		},
		MEASURE: { writeDataPoint },
		WORKER_NAME: 'test-worker',
	} as unknown as Environment
	return { env, fetch, writeDataPoint }
}

// A websocket upgrade request, `?loadId=` set only when passed.
function makeRequest(loadId?: string) {
	const url = new URL('https://x.test/api/room/board')
	if (loadId !== undefined) url.searchParams.set('loadId', loadId)
	const req = new Request(url, { headers: { upgrade: 'websocket' } })
	return Object.assign(req, { params: { roomId: 'board' } }) as unknown as IRequest
}

describe('forwardRoomRequest', () => {
	it('writes a data point keyed by loadId and forwards the received-at header', async () => {
		let forwarded: Request | undefined
		const { env, fetch, writeDataPoint } = makeEnv(async (req) => {
			forwarded = req
			return new Response('ok')
		})

		const response = await forwardRoomRequest(makeRequest('V1StGXR8_Z5jdHi6B-myT'), env)

		expect(response.status).toBe(200)
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(writeDataPoint).toHaveBeenCalledTimes(1)
		const [{ blobs }] = writeDataPoint.mock.calls[0]
		expect(blobs.slice(0, 3)).toEqual([
			'forward_room_request',
			'test-worker',
			'V1StGXR8_Z5jdHi6B-myT',
		])
		expect(forwarded?.headers.get('x-tldraw-received-at')).toMatch(/^\d+$/)
	})

	it('writes nothing when the request has no loadId', async () => {
		const { env, writeDataPoint } = makeEnv(async () => new Response('ok'))
		await forwardRoomRequest(makeRequest(), env)
		expect(writeDataPoint).not.toHaveBeenCalled()
	})

	it('writes nothing when loadId does not match the expected shape', async () => {
		const { env, writeDataPoint } = makeEnv(async () => new Response('ok'))
		await forwardRoomRequest(makeRequest('not valid!'), env)
		expect(writeDataPoint).not.toHaveBeenCalled()
	})
})
