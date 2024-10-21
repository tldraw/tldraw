import { isDevelopmentEnv } from '../../utils/env'

export function getFileUrl(fileId: string): string {
	return `/q/f/${fileId.split(':').pop()}`
}

export function getShareableFileUrl(fileId: string): string {
	const host = isDevelopmentEnv ? 'http://localhost:3000' : 'https://tldraw.com'
	return `${host}${getFileUrl(fileId)}`
}

export function getShareablePublishUrl(snapshotSlug: string): string {
	const host = isDevelopmentEnv ? 'http://localhost:3000' : 'https://tldraw.com'
	return `${host}/q/s/${snapshotSlug}`
}
