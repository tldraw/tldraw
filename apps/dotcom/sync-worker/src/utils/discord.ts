export async function sendDiscordNotification(
	webhookUrl: string | undefined,
	type: 'success' | 'error' | 'refund' | 'missing_user' | 'invite_redeemed',
	details: { transactionId?: string; userId?: string; email?: string; error?: string }
): Promise<void> {
	if (!webhookUrl) return

	const messages = {
		success: `🧚✨ Ka-ching! Someone just unlocked the magic! (${details.email || 'N/A'}) 💫🎊`,
		error: `🚨 Fairy access grant FAILED for transaction ${details.transactionId}: ${details.error}`,
		refund: `💸 Refund/cancellation for transaction ${details.transactionId}, userId: ${details.userId} - manual revocation needed`,
		missing_user: `⚠️ Transaction ${details.transactionId} missing userId in custom_data`,
		invite_redeemed: `🧚✨ Fairy invite redeemed! (${details.email || 'N/A'}) 💫🎊`,
	}

	try {
		await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content: messages[type] }),
		})
	} catch (error) {
		console.error('Failed to send Discord notification:', error)
	}
}
