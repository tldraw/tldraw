import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { upsertFairyAccess } from './adminRoutes'
import { FAIRY_WORLDWIDE_EXPIRATION } from './config'
import { createPostgresConnectionPool } from './postgres'
import { type Environment } from './types'

interface PaddleWebhookEvent {
	event_id: string
	event_type: string
	occurred_at: string
	data: {
		id: string
		status: string
		custom_data?: unknown
		items?: unknown[]
	}
}

function extractUserId(customData: unknown): string | null {
	if (customData && typeof customData === 'object') {
		const data = customData as Record<string, unknown>
		if (typeof data.userId === 'string' && data.userId) {
			return data.userId
		}
	}
	return null
}

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

async function insertPaddleTransaction(
	db: ReturnType<typeof createPostgresConnectionPool>,
	event: PaddleWebhookEvent,
	userId: string | null
): Promise<{ exists: boolean }> {
	const now = Date.now()
	const occurredAt = new Date(event.occurred_at).getTime()

	// Check if event already exists (idempotency)
	const existing = await db
		.selectFrom('paddle_transactions')
		.where('eventId', '=', event.event_id)
		.selectAll()
		.executeTakeFirst()

	if (existing) {
		return { exists: true }
	}

	// Insert new transaction event
	await db
		.insertInto('paddle_transactions')
		.values({
			eventId: event.event_id,
			transactionId: event.data.id,
			eventType: event.event_type,
			status: event.data.status,
			userId,
			processed: false,
			processedAt: null,
			processingError: null,
			eventData: event as any,
			occurredAt,
			receivedAt: now,
			updatedAt: now,
		})
		.execute()

	return { exists: false }
}

async function sendDiscordNotification(
	webhookUrl: string | undefined,
	type: 'success' | 'error' | 'refund' | 'missing_user',
	details: { transactionId: string; userId?: string; error?: string }
): Promise<void> {
	if (!webhookUrl) return

	const messages = {
		success: '🧚✨ Ka-ching! Someone just unlocked the magic! 💫🎊',
		error: `🚨 Fairy access grant FAILED for transaction ${details.transactionId}: ${details.error}`,
		refund: `💸 Refund/cancellation for transaction ${details.transactionId}, userId: ${details.userId} - manual revocation needed`,
		missing_user: `⚠️ Transaction ${details.transactionId} missing userId in custom_data`,
	}

	try {
		await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content: messages[type] }),
		})
	} catch (error) {
		console.error('[Paddle Webhook] Failed to send Discord notification:', error)
	}
}

async function markTransactionProcessed(
	db: ReturnType<typeof createPostgresConnectionPool>,
	eventId: string
): Promise<void> {
	await db
		.updateTable('paddle_transactions')
		.set({ processed: true, processedAt: Date.now() })
		.where('eventId', '=', eventId)
		.execute()
}

async function markTransactionError(
	db: ReturnType<typeof createPostgresConnectionPool>,
	eventId: string,
	error: string
): Promise<void> {
	await db
		.updateTable('paddle_transactions')
		.set({ processingError: error, updatedAt: Date.now() })
		.where('eventId', '=', eventId)
		.execute()
}

async function handleTransactionCompleted(
	env: Environment,
	db: ReturnType<typeof createPostgresConnectionPool>,
	event: PaddleWebhookEvent
): Promise<void> {
	const { data } = event
	const userId = extractUserId(data.custom_data)
	const webhookUrl = env.DISCORD_FAIRY_PURCHASE_WEBHOOK_URL

	if (!userId) {
		await sendDiscordNotification(webhookUrl, 'missing_user', { transactionId: data.id })
		return
	}

	const result = await upsertFairyAccess(
		env,
		userId,
		MAX_FAIRY_COUNT,
		FAIRY_WORLDWIDE_EXPIRATION,
		db
	)

	if (result.success) {
		await sendDiscordNotification(webhookUrl, 'success', { transactionId: data.id, userId })
		await markTransactionProcessed(db, event.event_id)
	} else {
		await sendDiscordNotification(webhookUrl, 'error', {
			transactionId: data.id,
			userId,
			error: result.error,
		})
		await markTransactionError(db, event.event_id, result.error ?? 'Unknown error')
	}
}

export const paddleWebhooks = createRouter<Environment>().post(
	'/app/paddle/webhook',
	async (req, env) => {
		const db = createPostgresConnectionPool(env, 'paddleWebhook')
		try {
			const event = await verifyWebhookSignature(env, req.clone())
			const userId = extractUserId(event.data.custom_data)

			const { exists } = await insertPaddleTransaction(db, event, userId)
			if (exists) {
				return json({ received: true })
			}

			if (event.event_type === 'transaction.completed') {
				await handleTransactionCompleted(env, db, event)
			} else if (event.event_type === 'transaction.canceled' && userId) {
				await sendDiscordNotification(env.DISCORD_FAIRY_PURCHASE_WEBHOOK_URL, 'refund', {
					transactionId: event.data.id,
					userId,
				})
			}

			return json({ received: true })
		} catch (error) {
			console.error('[Paddle Webhook] Error processing webhook:', error)
			if (error instanceof StatusError) {
				return json({ error: error.message }, { status: error.status })
			}
			return json({ error: 'Internal server error' }, { status: 500 })
		} finally {
			await db.destroy()
		}
	}
)
