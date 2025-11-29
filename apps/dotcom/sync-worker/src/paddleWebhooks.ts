import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { upsertFairyAccess } from './adminRoutes'
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

async function sendDiscordPurchaseNotification(webhookUrl: string) {
	try {
		await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				content: '🧚✨ Ka-ching! Someone just unlocked the magic! 💫🎊',
			}),
		})
	} catch (error) {
		console.error('[Paddle Webhook] Failed to send Discord notification:', error)
		// Don't throw - notification failure shouldn't fail the purchase
	}
}

async function handleTransactionCompleted(env: Environment, event: PaddleWebhookEvent) {
	const { data } = event

	// Validate transaction status - only grant access for completed transactions
	if (data.status !== 'completed') {
		console.warn(`[Paddle Webhook] Ignoring transaction ${data.id} with status: ${data.status}`)
		return { success: true, ignored: true }
	}

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

	const result = await upsertFairyAccess(env, userId)

	if (!result.success) {
		throw new StatusError(500, `Failed to grant fairy access: ${result.error}`)
	}

	if (env.DISCORD_FAIRY_PURCHASE_WEBHOOK_URL) {
		await sendDiscordPurchaseNotification(env.DISCORD_FAIRY_PURCHASE_WEBHOOK_URL)
	}

	return { success: true }
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
