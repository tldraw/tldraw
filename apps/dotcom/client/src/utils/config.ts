import { isPreviewEnv, isProductionEnv, isStagingEnv } from './env'

export const BOOKMARK_ENDPOINT = '/api/unfurl'

// some boilerplate to get the URL of the server to upload/fetch assets

if (!process.env.ASSET_UPLOAD) {
	throw new Error('Missing ASSET_UPLOAD env var')
}
export const ASSET_UPLOADER_URL: string = process.env.ASSET_UPLOAD

if (!process.env.IMAGE_WORKER) {
	throw new Error('Missing IMAGE_WORKER env var')
}
export const IMAGE_WORKER = process.env.IMAGE_WORKER

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
