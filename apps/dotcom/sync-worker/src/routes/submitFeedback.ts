import { MAX_PROBLEM_DESCRIPTION_LENGTH, SubmitFeedbackRequestBody } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { Environment } from '../types'
import { isRateLimited } from '../utils/rateLimit'
import { requireAuth } from '../utils/tla/getAuth'

export async function submitFeedback(req: IRequest, env: Environment) {
	const webhookUrl = env.DISCORD_FEEDBACK_WEBHOOK_URL
	if (!webhookUrl) {
		assert(env.IS_LOCAL, 'DISCORD_FEEDBACK_WEBHOOK_URL is not set')
	}
	const auth = await requireAuth(req, env)
	const isLimited = await isRateLimited(env, `submit-feedback:${auth.userId}`)
	if (isLimited) {
		return new Response('Rate limited', { status: 429 })
	}
	let description: string
	let allowContact: boolean
	let url: string
	try {
		const data = (await req.json()) as SubmitFeedbackRequestBody
		description = data.description?.trim()
		allowContact = data.allowContact
		url = data.url
		if (typeof description !== 'string') {
			throw new Error('Invalid description')
		}
		if (typeof allowContact !== 'boolean') {
			throw new Error('Invalid allowContact')
		}
		if (typeof url !== 'string') {
			throw new Error('Invalid url')
		}
	} catch (_e) {
		return new Response('Invalid JSON', { status: 400 })
	}

	const userId = allowContact ? await getUserEmail(env, auth.userId) : '~' + auth.userId.slice(-4)

	const payload = {
		username: `Feedback (${env.WORKER_NAME ?? 'localhost'})`,
		content: `User (${userId}) reported a problem`,
		embeds:
			description.length > MAX_PROBLEM_DESCRIPTION_LENGTH
				? undefined
				: [
						{
							description: `${description}\n\nURL: ${url}`,
						},
					],
	}

	if (webhookUrl) {
		const formData = new FormData()
		formData.append('payload_json', JSON.stringify(payload))
		if (description.length > MAX_PROBLEM_DESCRIPTION_LENGTH) {
			const descriptionBlob = new Blob([description], { type: 'text/plain' })
			formData.append('description.txt', descriptionBlob)
		}

		const res = await fetch(webhookUrl, {
			method: 'POST',
			body: formData,
		})
		if (!res.ok) {
			throw new Error(`Failed to send feedback to Discord: ${res.status} ${await res.text()}`)
		}
	} else {
		// eslint-disable-next-line no-console
		console.log('Feedback submitted:', payload)
	}

	return new Response('OK')
}

async function getUserEmail(env: Environment, userId: string) {
	const pg = createPostgresConnectionPool(env, 'submitFeedback')
	const { email } = await pg
		.selectFrom('user')
		.where('id', '=', userId)
		.select('email')
		.executeTakeFirstOrThrow()
	return email
}
