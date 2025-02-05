import { MAX_PROBLEM_DESCRIPTION_LENGTH, ReportAProblemRequestBody } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { Environment } from '../types'
import { isRateLimited } from '../utils/rateLimit'
import { requireAuth } from '../utils/tla/getAuth'

export async function reportAProblem(req: IRequest, env: Environment) {
	const webhookUrl = env.DISCORD_FEEDBACK_WEBHOOK_URL
	if (!webhookUrl) {
		assert(env.IS_LOCAL, 'DISCORD_FEEDBACK_WEBHOOK_URL is not set')
	}
	const auth = await requireAuth(req, env)
	const isLimited = await isRateLimited(env, `report-issue:${auth.userId}`)
	if (isLimited) {
		return new Response('Rate limited', { status: 429 })
	}
	let description: string
	let allowContact: boolean
	try {
		const data = (await req.json()) as ReportAProblemRequestBody
		description = data.description?.trim()
		allowContact = data.allowContact
		if (typeof description !== 'string' || description.length > MAX_PROBLEM_DESCRIPTION_LENGTH) {
			throw new Error('Invalid description')
		}
		if (typeof allowContact !== 'boolean') {
			throw new Error('Invalid allowContact')
		}
	} catch (_e) {
		return new Response('Invalid JSON', { status: 400 })
	}

	const userId = allowContact ? await getUserEmail(env, auth.userId) : '~' + auth.userId.slice(-4)

	const payload = {
		username: `Feedback (${env.WORKER_NAME ?? 'localhost'})`,
		content: `Someone reported a problem`,
		embeds: [
			{
				title: `User ${userId}`,
				description,
			},
		],
	}

	if (webhookUrl) {
		const res = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})
		if (!res.ok) {
			throw new Error(`Failed to send feedback to Discord: ${res.status} ${await res.text()}`)
		}
	} else {
		// eslint-disable-next-line no-console
		console.log('Reported a problem:', payload)
	}

	return new Response('OK')
}

async function getUserEmail(env: Environment, userId: string) {
	const pg = createPostgresConnectionPool(env, 'reportAProblem')
	const { email } = await pg
		.selectFrom('user')
		.where('id', '=', userId)
		.select('email')
		.executeTakeFirstOrThrow()
	return email
}
