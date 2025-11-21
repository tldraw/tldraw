export interface PaddleFairyCustomData {
	userId: string
	fairyLimit: number
}

// Validates and extracts fairy data from Paddle webhook transaction custom_data
export function parseFairyCustomData(customData: unknown): PaddleFairyCustomData {
	if (!customData || typeof customData !== 'object') {
		throw new Error('Missing custom_data on Paddle transaction')
	}

	const data = customData as Record<string, unknown>
	const userId = data.userId
	const fairyLimit = data.fairyLimit

	if (typeof userId !== 'string' || !userId) {
		throw new Error('Invalid userId in custom_data')
	}

	if (typeof fairyLimit !== 'number' || fairyLimit <= 0) {
		throw new Error('Invalid fairyLimit in custom_data')
	}

	return { userId, fairyLimit }
}
