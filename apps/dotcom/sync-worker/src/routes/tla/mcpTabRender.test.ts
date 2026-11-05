import { describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { postTabRenderReply } from './mcpTabRender'

function makeEnv(received = true) {
	const receiveTabRenderReply = vi.fn(async () => received)
	const env = {
		TLDR_DOC: { idFromName: (name: string) => name, get: () => ({ receiveTabRenderReply }) },
	} as unknown as Environment
	return { env, receiveTabRenderReply }
}

function makeRequest(body: string, params = { roomId: 'file-1', jobId: 'job-1' }) {
	const request = new Request('https://sync.tldraw.xyz/app/file/file-1/tab-render/job-1', {
		method: 'POST',
		body,
	})
	return Object.assign(request, { params }) as any
}

describe('postTabRenderReply', () => {
	it('hands a valid reply to the job in that room', async () => {
		const { env, receiveTabRenderReply } = makeEnv()

		const response = await postTabRenderReply(
			makeRequest(JSON.stringify({ status: 'accepted' })),
			env
		)

		expect(response.status).toBe(200)
		expect(receiveTabRenderReply).toHaveBeenCalledWith('job-1', { status: 'accepted' })
	})

	// Same answer for a job that finished and one that never existed: late replies are normal, since
	// the first tab to answer ends the job for the others.
	it('answers 404 when no job is waiting under that id', async () => {
		const { env } = makeEnv(false)
		const response = await postTabRenderReply(
			makeRequest(JSON.stringify({ status: 'accepted' })),
			env
		)
		expect(response.status).toBe(404)
	})

	it('refuses malformed JSON without reaching the object', async () => {
		const { env, receiveTabRenderReply } = makeEnv()
		const response = await postTabRenderReply(makeRequest('not json'), env)
		expect(response.status).toBe(400)
		expect(receiveTabRenderReply).not.toHaveBeenCalled()
	})

	it('refuses a body that is not a reply without reaching the object', async () => {
		const { env, receiveTabRenderReply } = makeEnv()
		const response = await postTabRenderReply(
			makeRequest(JSON.stringify({ status: 'captured', base64: 'not a png' })),
			env
		)
		expect(response.status).toBe(400)
		expect(receiveTabRenderReply).not.toHaveBeenCalled()
	})

	it('refuses an oversized body without parsing it', async () => {
		const { env, receiveTabRenderReply } = makeEnv()
		const response = await postTabRenderReply(makeRequest('x'.repeat(17 * 1024 * 1024)), env)
		expect(response.status).toBe(413)
		expect(receiveTabRenderReply).not.toHaveBeenCalled()
	})
})
