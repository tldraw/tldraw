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

	// Try to create a Plain thread (non-blocking — Discord post still happens on failure)
	let plainThreadUrl: string | null = null
	if (env.PLAIN_API_KEY) {
		try {
			const email = allowContact ? userId : null
			plainThreadUrl = await createPlainThread(env, { description, url, email })
		} catch (e) {
			console.error('Failed to create Plain thread:', e)
		}
	}

	const embedDescription = plainThreadUrl
		? `${description}\n\nURL: ${url}\nPlain: ${plainThreadUrl}`
		: `${description}\n\nURL: ${url}`

	const payload = {
		username: `Feedback (${env.WORKER_NAME ?? 'localhost'})`,
		content: `User (${userId}) reported a problem`,
		embeds:
			description.length > MAX_PROBLEM_DESCRIPTION_LENGTH
				? undefined
				: [
						{
							description: embedDescription,
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

const CREATE_THREAD_MUTATION = `
mutation createThread($input: CreateThreadInput!) {
  createThread(input: $input) {
    thread { id }
    error { message type code }
  }
}
`

async function createPlainThread(
	env: Environment,
	{ description, url, email }: { description: string; url: string; email: string | null }
): Promise<string> {
	const customerIdentifier = email
		? { emailAddress: email }
		: { emailAddress: 'anonymous-feedback@tldraw.com' }

	const fromLabel = email ?? 'anonymous'
	const title = `Dotcom feedback from ${fromLabel}`

	const truncatedDescription =
		description.length > 200 ? description.slice(0, 200) + '…' : description

	const components = [
		{
			componentText: {
				text: `${description}\n\nURL: ${url}`,
			},
		},
	]

	const input: Record<string, unknown> = {
		customerIdentifier,
		title,
		description: truncatedDescription,
		components,
	}

	if (env.PLAIN_LABEL_TYPE_ID) {
		input.labelTypeIds = [env.PLAIN_LABEL_TYPE_ID]
	}

	const res = await fetch('https://core-api.uk.plain.com/graphql/v1', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.PLAIN_API_KEY}`,
		},
		body: JSON.stringify({
			query: CREATE_THREAD_MUTATION,
			variables: { input },
		}),
	})

	if (!res.ok) {
		throw new Error(`Plain API returned ${res.status}: ${await res.text()}`)
	}

	const body = (await res.json()) as {
		data?: {
			createThread?: {
				thread?: { id: string }
				error?: { message: string; type: string; code: string }
			}
		}
		errors?: { message: string }[]
	}

	if (body.errors?.length) {
		throw new Error(`Plain GraphQL error: ${body.errors[0].message}`)
	}

	const result = body.data?.createThread
	if (result?.error) {
		throw new Error(`Plain createThread error: ${result.error.message} (${result.error.code})`)
	}

	const threadId = result?.thread?.id
	if (!threadId) {
		throw new Error('Plain createThread returned no thread id')
	}

	return `https://app.plain.com/thread/${threadId}`
}
