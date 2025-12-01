import {
	MAX_FAIRY_COUNT,
	type PaddleCustomData,
	type TlaPaddleTransaction,
} from '@tldraw/dotcom-shared'
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
		custom_data?: PaddleCustomData
		items?: unknown[]
	}
}

function extractUserData(customData: PaddleCustomData | undefined): {
	userId: string | null
	email: string | null
} {
	if (!customData) {
		return { userId: null, email: null }
	}
	return {
		userId: customData.userId ?? null,
		email: customData.email ?? null,
	}
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

async function insertAndLockPaddleTransaction(
	db: ReturnType<typeof createPostgresConnectionPool>,
	event: PaddleWebhookEvent,
	userId: string | null
): Promise<TlaPaddleTransaction> {
	const now = Date.now()
	const occurredAt = new Date(event.occurred_at).getTime()

	// Transaction: insert (if not exists) + lock + read
	const record = await db.transaction().execute(async (trx) => {
		// Try to insert (onConflict does nothing if eventId exists)
		await trx
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
			.onConflict((oc) => oc.column('eventId').doNothing())
			.execute()

		// Lock row and read (blocks concurrent handlers for same eventId)
		const rec = await trx
			.selectFrom('paddle_transactions')
			.selectAll()
			.where('eventId', '=', event.event_id)
			.forUpdate()
			.executeTakeFirstOrThrow()

		return rec
	})

	return record
}

async function sendDiscordNotification(
	webhookUrl: string | undefined,
	type: 'success' | 'error' | 'refund' | 'missing_user',
	details: { transactionId: string; userId?: string; email?: string; error?: string }
): Promise<void> {
	if (!webhookUrl) return

	const messages = {
		success: `🧚✨ Ka-ching! Someone just unlocked the magic! (${details.email || 'N/A'}) 💫🎊`,
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
	try {
		await db
			.updateTable('paddle_transactions')
			.set({ processed: true, processedAt: Date.now(), updatedAt: Date.now() })
			.where('eventId', '=', eventId)
			.execute()
	} catch (error) {
		console.error('[Paddle Webhook] Failed to mark transaction as processed (non-fatal)', {
			eventId,
			error: error instanceof Error ? error.message : String(error),
		})
		// Don't throw - transaction logging failure shouldn't fail webhook
	}
}

async function markTransactionError(
	db: ReturnType<typeof createPostgresConnectionPool>,
	eventId: string,
	error: string
): Promise<void> {
	try {
		await db
			.updateTable('paddle_transactions')
			.set({ processingError: error, updatedAt: Date.now() })
			.where('eventId', '=', eventId)
			.execute()
	} catch (dbError) {
		console.error('[Paddle Webhook] Failed to store processing error (non-fatal)', {
			eventId,
			originalError: error,
			dbError: dbError instanceof Error ? dbError.message : String(dbError),
		})
		// Don't throw - transaction logging failure shouldn't fail webhook
	}
}

async function handleTransactionCompleted(
	env: Environment,
	db: ReturnType<typeof createPostgresConnectionPool>,
	event: PaddleWebhookEvent
): Promise<void> {
	const { data } = event
	const { userId, email } = extractUserData(data.custom_data)
	const webhookUrl = env.DISCORD_FAIRY_PURCHASE_WEBHOOK_URL

	if (!userId) {
		await sendDiscordNotification(webhookUrl, 'missing_user', { transactionId: data.id })
		throw new Error('Missing userId in transaction custom_data')
	}

	// Try to grant fairy access - this is the critical path
	let fairyAccessResult
	try {
		fairyAccessResult = await upsertFairyAccess(
			env,
			userId,
			MAX_FAIRY_COUNT,
			FAIRY_WORLDWIDE_EXPIRATION,
			db
		)
	} catch (error) {
		// UNEXPECTED error - fail webhook so Paddle retries
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error('[Paddle Webhook] UNEXPECTED: upsertFairyAccess threw', {
			eventId: event.event_id,
			transactionId: data.id,
			userId,
			error: errorMessage,
			stack: error instanceof Error ? error.stack : undefined,
		})

		await sendDiscordNotification(webhookUrl, 'error', {
			transactionId: data.id,
			userId,
			error: `UNEXPECTED ERROR: ${errorMessage}`,
		})

		await markTransactionError(db, event.event_id, `UNEXPECTED: ${errorMessage}`)

		// Re-throw to fail webhook and trigger Paddle retry
		throw error
	}

	// Check result - business logic failure, should also fail webhook
	if (!fairyAccessResult.success) {
		const errorMessage = fairyAccessResult.error || 'Unknown error'
		console.error('[Paddle Webhook] Failed to grant fairy access', {
			eventId: event.event_id,
			transactionId: data.id,
			userId,
			error: errorMessage,
		})

		await sendDiscordNotification(webhookUrl, 'error', {
			transactionId: data.id,
			userId,
			error: errorMessage,
		})

		await markTransactionError(db, event.event_id, errorMessage)

		// Throw to fail webhook and trigger Paddle retry
		throw new Error(`Failed to grant fairy access: ${errorMessage}`)
	}

	await sendDiscordNotification(webhookUrl, 'success', {
		transactionId: data.id,
		userId,
		email: email ?? undefined,
	})
	await markTransactionProcessed(db, event.event_id)
}

export const paddleWebhooks = createRouter<Environment>().post(
	'/app/paddle/webhook',
	async (req, env) => {
		const db = createPostgresConnectionPool(env, 'paddleWebhook')
		try {
			const event = await verifyWebhookSignature(env, req.clone())
			const { userId } = extractUserData(event.data.custom_data)

			const record = await insertAndLockPaddleTransaction(db, event, userId)
			if (record.processed) {
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
