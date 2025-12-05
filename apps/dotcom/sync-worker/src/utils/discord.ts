type DiscordNotification =
	| { type: 'success'; email: string }
	| { type: 'error'; transactionId: string; error: string }
	| { type: 'refund'; transactionId: string; userId: string }
	| { type: 'missing_user'; transactionId: string }
	| { type: 'invite_redeemed'; email: string; description?: string }

export function sendDiscordNotification(
	webhookUrl: string | undefined,
	notification: DiscordNotification,
	ctx: ExecutionContext
): void {
	if (!webhookUrl) return

	const sendNotification = async () => {
		let message: string
		switch (notification.type) {
			case 'success':
				message = `🧚✨ Ka-ching! Someone just unlocked the magic! (${notification.email}) 💫🎊`
				break
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
