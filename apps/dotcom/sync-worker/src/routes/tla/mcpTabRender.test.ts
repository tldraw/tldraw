import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { mintTabRenderJobIds } from '../../utils/tabRenderJobIds'
import { parseTabRenderReply, postTabRenderReply } from './mcpTabRender'

const SECRET = { MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret' } as Environment
let JOB_ID: string
beforeAll(async () => {
	;[JOB_ID] = await mintTabRenderJobIds(SECRET, 'file-1', 1)
})

function makeEnv({ jobExists = true, received = true } = {}) {
	const hasTabRenderJob = vi.fn(async () => jobExists)
	const receiveTabRenderReply = vi.fn(async () => received)
	const env = {
		...SECRET,
		TLDR_DOC: {
			idFromName: (name: string) => name,
			get: () => ({ hasTabRenderJob, receiveTabRenderReply }),
		},
	} as unknown as Environment
	return { env, hasTabRenderJob, receiveTabRenderReply }
}

function makeRequest(body: string, { jobId = JOB_ID, length = String(body.length) } = {}) {
	const request = new Request(`https://sync.tldraw.xyz/app/file/file-1/tab-render/${jobId}`, {
		method: 'POST',
		headers: length ? { 'content-length': length } : {},
		body,
	})
	return Object.assign(request, { params: { roomId: 'file-1', jobId } }) as any
}

const ACCEPTED = JSON.stringify({ status: 'accepted' })

describe('postTabRenderReply', () => {
	it('takes a reply with no sign-in, on the strength of a live job id', async () => {
		const { env, hasTabRenderJob, receiveTabRenderReply } = makeEnv()

		const response = await postTabRenderReply(makeRequest(ACCEPTED), env)

		expect(response.status).toBe(200)
		expect(hasTabRenderJob).toHaveBeenCalledWith(JOB_ID)
		expect(receiveTabRenderReply).toHaveBeenCalledWith(JOB_ID, { status: 'accepted' })
	})

	// Same answer for a job that finished and one that never existed: late replies are normal, since
	// the first tab to answer ends the job for the others.
	it('answers 404 when no job is waiting under that id', async () => {
		const { env } = makeEnv({ jobExists: false })
		const response = await postTabRenderReply(makeRequest(ACCEPTED), env)
		expect(response.status).toBe(404)
	})

	it('answers 404 when the job ended between the check and the reply', async () => {
		const { env } = makeEnv({ received: false })
		const response = await postTabRenderReply(makeRequest(ACCEPTED), env)
		expect(response.status).toBe(404)
	})

	// The route takes no sign-in, so an unknown job's body must not reach a room's object: enough of
	// them at once could reset it and disconnect everyone on the board.
	it('does not read or forward the body of a job that does not exist', async () => {
		const { env, receiveTabRenderReply } = makeEnv({ jobExists: false })
		const request = makeRequest(ACCEPTED)
		const read = vi.spyOn(request, 'json')

		await postTabRenderReply(request, env)

		expect(read).not.toHaveBeenCalled()
		expect(receiveTabRenderReply).not.toHaveBeenCalled()
	})

	it('does not reach the object at all for a job id that is not one it could have issued', async () => {
		const { env, hasTabRenderJob } = makeEnv()
		const response = await postTabRenderReply(makeRequest(ACCEPTED, { jobId: 'made-up' }), env)
		expect(response.status).toBe(404)
		expect(hasTabRenderJob).not.toHaveBeenCalled()
	})

	// The forged-id test above, but with an id that has the right shape: a bare UUID was a valid job
	// id before they were signed, and one signed for another board must not open this one.
	it('does not reach the object for an unsigned id, or one signed for another room', async () => {
		const [otherRoomJobId] = await mintTabRenderJobIds(SECRET, 'file-2', 1)
		for (const jobId of ['6f1c1d3a-0b7e-4f6a-9a53-2c4d8e7f1a90', otherRoomJobId]) {
			const { env, hasTabRenderJob } = makeEnv()
			const response = await postTabRenderReply(makeRequest(ACCEPTED, { jobId }), env)
			expect(response.status, jobId).toBe(404)
			expect(hasTabRenderJob, jobId).not.toHaveBeenCalled()
		}
	})

	it('refuses an oversized reply from its header, without reaching the object', async () => {
		const { env, hasTabRenderJob } = makeEnv()
		const response = await postTabRenderReply(
			makeRequest(ACCEPTED, { length: String(17 * 1024 * 1024) }),
			env
		)
		expect(response.status).toBe(413)
		expect(hasTabRenderJob).not.toHaveBeenCalled()
	})

	it('refuses a reply with no declared length, since nothing else bounds it', async () => {
		const { env, hasTabRenderJob } = makeEnv()
		const response = await postTabRenderReply(makeRequest(ACCEPTED, { length: '' }), env)
		expect(response.status).toBe(411)
		expect(hasTabRenderJob).not.toHaveBeenCalled()
	})

	it('refuses malformed JSON', async () => {
		const { env, receiveTabRenderReply } = makeEnv()
		const response = await postTabRenderReply(makeRequest('not json'), env)
		expect(response.status).toBe(400)
		expect(receiveTabRenderReply).not.toHaveBeenCalled()
	})

	it('refuses a body that is not a reply', async () => {
		const { env, receiveTabRenderReply } = makeEnv()
		const response = await postTabRenderReply(
			makeRequest(JSON.stringify({ status: 'captured', base64: 'not a png' })),
			env
		)
		expect(response.status).toBe(400)
		expect(receiveTabRenderReply).not.toHaveBeenCalled()
	})
})

const CLUSTER = {
	id: 'cluster:a',
	label: 'Ideas',
	keywords: ['ideas'],
	numberOfShapes: 1,
}

const PAGE_READ = {
	pageId: 'page:a',
	pageName: 'Cover',
	clusters: [{ ...CLUSTER, bounds: { x: 0, y: 0, w: 10, h: 10 } }],
	details: [
		{
			...CLUSTER,
			shapes: [{ id: 'shape:a', type: 'geo', parentId: 'page:a', x: 0, y: 0, props: {} }],
		},
	],
	ancestors: [],
	bindings: [],
	arrows: {},
	dimensions: {},
}

describe('parseTabRenderReply', () => {
	it.each([
		[{ status: 'accepted' }],
		[{ status: 'declined', reason: 'page_not_current' }],
		[{ status: 'page_read', read: PAGE_READ }],
		[{ status: 'page_not_found', reason: 'page_out_of_range', pageCount: 2 }],
		[{ status: 'captured', base64: 'iVBORw0KGgoAAAANSUhEUg' }],
	])('accepts %j', (reply) => {
		expect(parseTabRenderReply(reply)).toEqual(reply)
	})

	it.each([
		[null],
		['accepted'],
		[{ status: 'nonsense' }],
		[{ status: 'declined', reason: 'not a reason' }],
		[{ status: 'page_read' }],
		[{ status: 'page_read', read: { ...PAGE_READ, clusters: [{ id: 'c', label: 'x' }] } }],
		[{ status: 'page_read', read: { ...PAGE_READ, details: [{ ...CLUSTER, shapes: [{}] }] } }],
		[{ status: 'page_read', read: { ...PAGE_READ, arrows: [] } }],
		[{ status: 'page_not_found', reason: 'page_out_of_range', pageCount: -1 }],
		[{ status: 'page_not_found', reason: 'nope', pageCount: 1 }],
		[{ status: 'captured', base64: 42 }],
		// Whatever this is, the tool result would call it a PNG.
		[{ status: 'captured', base64: 'PHN2ZyB4bWxucz0' }],
	])('refuses %j', (reply) => {
		expect(parseTabRenderReply(reply)).toBeNull()
	})
})
