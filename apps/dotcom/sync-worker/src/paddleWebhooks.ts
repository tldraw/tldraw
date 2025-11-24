import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { sql } from 'kysely'
import { FAIRY_WORLDWIDE_EXPIRATION } from './config'
import { createPostgresConnectionPool } from './postgres'
import { type Environment } from './types'
import { getUserDurableObject } from './utils/durableObjects'

interface PaddleTransactionCompletedEvent {
	event_id: string
	event_type: 'transaction.completed'
	occurred_at: string
	data: {
		id: string
		custom_data?: unknown
		items?: unknown[]
	}
}

type PaddleWebhookEvent = PaddleTransactionCompletedEvent

async function verifyPaddleSignature(
	webhookSecret: string,
	body: string,
	timestamp: string,
	signatureHash: string
): Promise<void> {
	// Reconstruct the signed payload
	const signedPayload = `${timestamp}:${body}`

	// Compute expected signature
	const encoder = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(webhookSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)

	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
	const expectedHash = Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')

	if (expectedHash !== signatureHash) {
		throw new StatusError(401, 'Invalid signature')
	}

	// Check timestamp to prevent replay attacks (within 5 minutes)
	const eventTime = parseInt(timestamp) * 1000
	const now = Date.now()
	if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
		throw new StatusError(401, 'Timestamp too old or too far in future')
	}
}

async function verifyWebhookSignature(
	env: Environment,
	request: Request
): Promise<PaddleWebhookEvent> {
	const webhookSecret = env.PADDLE_WEBHOOK_SECRET
	if (!webhookSecret) {
		throw new StatusError(500, 'PADDLE_WEBHOOK_SECRET not configured')
	}

	// Get signature from headers
	const signature = request.headers.get('paddle-signature')
	if (!signature) {
		throw new StatusError(401, 'Missing paddle-signature header')
	}

	// Get raw body as text
	const body = await request.text()

	// Parse signature header
	// Format: "ts=1234567890;h1=abc123..."
	const sigParts = signature.split(';').reduce(
		(acc, part) => {
			const [key, value] = part.split('=')
			acc[key] = value
			return acc
		},
		{} as Record<string, string>
	)

	const timestamp = sigParts['ts']
	const signatureHash = sigParts['h1']

	if (!timestamp || !signatureHash) {
		throw new StatusError(401, 'Invalid signature format')
	}

	try {
		await verifyPaddleSignature(webhookSecret, body, timestamp, signatureHash)
		// Parse and return the event
		return JSON.parse(body) as PaddleWebhookEvent
	} catch (error) {
		console.error('Webhook signature verification failed:', error)
		throw new StatusError(401, 'Signature verification failed')
	}
}

async function handleTransactionCompleted(
	env: Environment,
	event: PaddleTransactionCompletedEvent
) {
	const { data } = event

	// Extract userId from transaction custom_data
	let userId: string
	try {
		if (!data.custom_data || typeof data.custom_data !== 'object') {
			throw new Error('Missing custom_data on transaction')
		}
		const transactionData = data.custom_data as Record<string, unknown>
		userId = transactionData.userId as string
		if (typeof userId !== 'string' || !userId) {
			throw new Error('Invalid userId in transaction custom_data')
		}
	} catch (error) {
		console.error('Failed to parse transaction custom_data:', error)
		throw new StatusError(400, 'Invalid transaction custom_data')
	}

	// Extract fairyLimit from item quantity
	let fairyLimit: number
	try {
		const items = data.items as any[]
		if (!items || items.length === 0) {
			throw new Error('No items in transaction')
		}
		const quantity = items[0]?.quantity
		fairyLimit = parseInt(String(quantity), 10)
		if (isNaN(fairyLimit) || fairyLimit <= 0) {
			throw new Error('Invalid quantity in transaction items')
		}
	} catch (error) {
		console.error('Failed to parse transaction quantity:', error)
		throw new StatusError(400, 'Invalid transaction quantity')
	}

	const expiresAt = FAIRY_WORLDWIDE_EXPIRATION

	// Upsert user_fairies table with atomic increment to prevent race conditions
	const db = createPostgresConnectionPool(env, '/paddle/transaction.completed')

	try {
		// Cap insert value at MAX_FAIRY_COUNT for new users
		const cappedQuantity = Math.min(fairyLimit, MAX_FAIRY_COUNT)

		await db
			.insertInto('user_fairies')
			.values({
				userId,
				fairies: '{}',
				fairyLimit: cappedQuantity,
				fairyAccessExpiresAt: expiresAt,
			})
			.onConflict((oc) =>
				oc.column('userId').doUpdateSet({
					fairyLimit: sql`LEAST(user_fairies."fairyLimit" + ${fairyLimit}, ${MAX_FAIRY_COUNT})`,
					fairyAccessExpiresAt: expiresAt,
				})
			)
			.execute()

		// Trigger User DO refresh to pick up new fairy access
		const userDO = getUserDurableObject(env, userId)
		await userDO.refreshUserData(userId)
	} catch (error) {
		console.error('Failed to update user_fairies:', error)
		throw new StatusError(500, `Database update failed: ${error}`)
	} finally {
		await db.destroy()
	}
}

export const paddleWebhooks = createRouter<Environment>().post(
	'/app/paddle/webhook',
	async (req, env) => {
		try {
			// Verify webhook signature and parse event
			const event = await verifyWebhookSignature(env, req.clone())

			// Handle event based on type
			if (event.event_type === 'transaction.completed') {
				await handleTransactionCompleted(env, event)
			}

			return json({ received: true })
		} catch (error) {
			console.error('[Paddle Webhook] Error processing webhook:', error)
			if (error instanceof StatusError) {
				return json({ error: error.message }, { status: error.status })
			}
			return json({ error: 'Internal server error' }, { status: 500 })
		}
	}
)
