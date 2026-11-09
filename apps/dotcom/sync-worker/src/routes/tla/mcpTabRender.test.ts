import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { SignedInAuth } from '../../utils/tla/getAuth'

vi.mock('../../utils/tla/getAuth', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../utils/tla/getAuth')>()),
	getAuth: vi.fn(),
}))

const { getAuth } = await import('../../utils/tla/getAuth')
const { parseTabRenderReply, postTabRenderReply } = await import('./mcpTabRender')

const JOB_ID = '6f1c1d3a-0b7e-4f6a-9a53-2c4d8e7f1a90'

function makeEnv({ jobExists = true, received = true } = {}) {
	const hasTabRenderJob = vi.fn(async () => jobExists)
	const receiveTabRenderReply = vi.fn(async () => received)
	const env = {
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
	beforeEach(() => {
		vi.mocked(getAuth).mockResolvedValue({ userId: 'user_a' } as SignedInAuth)
	})

	it('refuses a reply without a website session, without reaching the object', async () => {
		vi.mocked(getAuth).mockResolvedValue(null)
		const { env, hasTabRenderJob } = makeEnv()

		const response = await postTabRenderReply(makeRequest(ACCEPTED), env)

		expect(response.status).toBe(401)
		expect(hasTabRenderJob).not.toHaveBeenCalled()
	})

	it('checks the job against the signed-in user', async () => {
		const { env, hasTabRenderJob } = makeEnv()
		await postTabRenderReply(makeRequest(ACCEPTED), env)
		expect(hasTabRenderJob).toHaveBeenCalledWith(JOB_ID, 'user_a')
	})

	it('hands a valid reply to the job in that room', async () => {
		const { env, receiveTabRenderReply } = makeEnv()

		const response = await postTabRenderReply(makeRequest(ACCEPTED), env)

		expect(response.status).toBe(200)
		expect(receiveTabRenderReply).toHaveBeenCalledWith(JOB_ID, 'user_a', { status: 'accepted' })
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

describe('parseTabRenderReply', () => {
	it.each([
		[{ status: 'accepted' }],
		[{ status: 'declined', reason: 'page_not_current' }],
		[{ status: 'measured', shapes: {} }],
		[{ status: 'captured', base64: 'iVBORw0KGgoAAAANSUhEUg' }],
	])('accepts %j', (reply) => {
		expect(parseTabRenderReply(reply)).toEqual(reply)
	})

	it.each([
		[null],
		['accepted'],
		[{ status: 'nonsense' }],
		[{ status: 'declined', reason: 'not a reason' }],
		[{ status: 'measured' }],
		[{ status: 'measured', shapes: [] }],
		[{ status: 'captured', base64: 42 }],
		// Whatever this is, the tool result would call it a PNG.
		[{ status: 'captured', base64: 'PHN2ZyB4bWxucz0' }],
	])('refuses %j', (reply) => {
		expect(parseTabRenderReply(reply)).toBeNull()
	})
})
