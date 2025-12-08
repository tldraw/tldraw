import { createPostgresConnectionPool } from '../postgres'
import type { Environment } from '../types'

type DiscordNotification =
	| { type: 'success'; email: string; env: Environment }
	| { type: 'error'; transactionId: string; error: string }
	| { type: 'refund'; transactionId: string; userId: string }
	| { type: 'missing_user'; transactionId: string }
	| { type: 'invite_redeemed'; email: string; description?: string }

async function getCompletedTransactionCount(env: Environment): Promise<string> {
	const db = createPostgresConnectionPool(env, 'discordNotification')
	try {
		const result = await db
			.selectFrom('paddle_transactions')
			.select((eb) => eb.fn.count<string>('transactionId').distinct().as('count'))
			.where('eventType', '=', 'transaction.completed')
			.where('status', '=', 'completed')
			.executeTakeFirst()
		const count = parseInt(result?.count ?? '0')
		// Add +1 to account for one transaction from Nov 28 (before paddle_transactions table existed)
		return (count + 1).toString()
	} catch (error) {
		console.error('Failed to query transaction count:', error)
		return '?'
	} finally {
		await db.destroy()
	}
}

export function sendDiscordNotification(
	webhookUrl: string | undefined,
	notification: DiscordNotification,
	ctx: ExecutionContext
): void {
	if (!webhookUrl) return

	const sendNotification = async () => {
		let message: string
		switch (notification.type) {
			case 'success': {
				const totalCount = await getCompletedTransactionCount(notification.env)
				message = `🧚✨ Ka-ching! Someone just unlocked the magic! (${notification.email}) Total: ${totalCount} 💫🎊`
				break
			}
			case 'error':
				message = `🚨 Fairy access grant FAILED for transaction ${notification.transactionId}: ${notification.error}`
				break
			case 'refund':
				message = `💸 Refund/cancellation for transaction ${notification.transactionId}, userId: ${notification.userId} - manual revocation needed`
				break
			case 'missing_user':
				message = `⚠️ Transaction ${notification.transactionId} missing userId in custom_data`
				break
			case 'invite_redeemed':
				message = `🧚✨ Fairy invite redeemed! (${notification.email})${notification.description ? ` - ${notification.description}` : ''} 💫🎊`
				break
		}

		try {
			await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: message }),
			})
		} catch (error) {
			console.error('Failed to send Discord notification:', error)
		}
	}

	ctx.waitUntil(sendNotification())
}
