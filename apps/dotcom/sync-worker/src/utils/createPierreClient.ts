import { GitStorage } from '@pierre/storage'
import { Environment } from '../types'

export function createPierreClient(env: Environment): GitStorage | undefined {
	// Only enable Pierre in non-production environments
	if (env.TLDRAW_ENV === 'production') {
		return undefined
	}

	if (!env.PIERRE_KEY) {
		return undefined
	}

	try {
		return new GitStorage({
			name: 'tldraw',
			key: env.PIERRE_KEY,
		})
	} catch (error) {
		console.error('Failed to initialize Pierre client:', error)
		return undefined
	}
}
