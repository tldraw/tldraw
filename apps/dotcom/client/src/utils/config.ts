import { isPreviewEnv, isProductionEnv, isStagingEnv } from './env'

export const BOOKMARK_ENDPOINT = '/api/unfurl'

if (!process.env.USER_CONTENT_URL) {
	throw new Error('Missing USER_CONTENT_URL env var')
}
export const USER_CONTENT_URL: string = process.env.USER_CONTENT_URL

if (!process.env.MULTIPLAYER_SERVER) {
	throw new Error('Missing MULTIPLAYER_SERVER env var')
}
if (!process.env.ZERO_SERVER) {
	throw new Error('Missing ZERO_SERVER env var')
}
export const MULTIPLAYER_SERVER =
	// if we're on the client in a production-ish environment, the origin should be on the same domain
	(isStagingEnv || isProductionEnv) && typeof location !== 'undefined'
		? `${window.location.origin}/api`
		: process.env.MULTIPLAYER_SERVER.replace(/^http/, 'ws')

export const ZERO_SERVER =
	(isStagingEnv || isProductionEnv || isPreviewEnv) && typeof location !== 'undefined'
		? process.env.ZERO_SERVER
		: 'http://localhost:4848/'
