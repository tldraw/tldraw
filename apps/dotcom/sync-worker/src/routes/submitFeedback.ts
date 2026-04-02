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

	// Create a Plain thread if configured. Failures are caught so the Discord post still goes through.
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

const UPSERT_CUSTOMER_MUTATION = `
mutation upsertCustomer($input: UpsertCustomerInput!) {
  upsertCustomer(input: $input) {
    customer { id }
    error { message code }
  }
}
`

const CREATE_THREAD_MUTATION = `
mutation createThread($input: CreateThreadInput!) {
  createThread(input: $input) {
    thread { id }
    error { message code }
  }
}
`

interface PlainMutationResult {
	error?: { message: string; code: string }
}

async function plainMutation<T extends PlainMutationResult>(
	env: Environment,
	query: string,
	variables: Record<string, unknown>,
	resultKey: string
): Promise<T> {
	const res = await fetch('https://core-api.uk.plain.com/graphql/v1', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.PLAIN_API_KEY}`,
		},
		body: JSON.stringify({ query, variables }),
	})

	if (!res.ok) {
		throw new Error(`Plain API returned ${res.status}: ${await res.text()}`)
	}

	const body = (await res.json()) as {
		data?: Record<string, unknown>
		errors?: { message: string }[]
	}
	if (body.errors?.length) {
		throw new Error(`Plain GraphQL error: ${body.errors[0].message}`)
	}

	const result = body.data?.[resultKey] as T | undefined
	if (result?.error) {
		throw new Error(`Plain ${resultKey} error: ${result.error.message} (${result.error.code})`)
	}
	if (!result) {
		throw new Error(`Plain ${resultKey} returned no result`)
	}

	return result
}

async function upsertPlainCustomer(env: Environment, email: string): Promise<string> {
	const result = await plainMutation<PlainMutationResult & { customer?: { id: string } }>(
		env,
		UPSERT_CUSTOMER_MUTATION,
		{
			input: {
				identifier: { emailAddress: email },
				onCreate: { fullName: email, email: { email, isVerified: false } },
				onUpdate: {},
			},
		},
		'upsertCustomer'
	)

	if (!result.customer?.id) {
		throw new Error('Plain upsertCustomer returned no customer id')
	}
	return result.customer.id
}

async function createPlainThread(
	env: Environment,
	{ description, url, email }: { description: string; url: string; email: string | null }
): Promise<string> {
	const customerEmail = email ?? 'anonymous-feedback@tldraw.com'
	const customerId = await upsertPlainCustomer(env, customerEmail)

	const result = await plainMutation<PlainMutationResult & { thread?: { id: string } }>(
		env,
		CREATE_THREAD_MUTATION,
		{
			input: {
				customerIdentifier: { customerId },
				title: 'tldraw.com feedback',
				description: description.length > 200 ? description.slice(0, 200) + '…' : description,
				components: [{ componentText: { text: `${description}\n\nURL: ${url}` } }],
				...(env.PLAIN_LABEL_TYPE_ID && { labelTypeIds: [env.PLAIN_LABEL_TYPE_ID] }),
			},
		},
		'createThread'
	)

	if (!result.thread?.id) {
		throw new Error('Plain createThread returned no thread id')
	}

	const threadId = result.thread.id
	if (env.PLAIN_WORKSPACE_ID) {
		return `https://app.plain.com/workspace/${env.PLAIN_WORKSPACE_ID}/thread/${threadId}/`
	}
	return `https://app.plain.com/thread/${threadId}`
}
