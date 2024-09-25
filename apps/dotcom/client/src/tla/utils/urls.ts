import { isDevelopmentEnv } from '../../utils/env'
import { TldrawAppFileId } from './schema/TldrawAppFile'
import { getCleanId } from './tldrawAppSchema'

export function getFileUrl(fileId: string): string {
	return `/q/f/${getCleanId(fileId)}`
}

export function getShareableFileUrl(fileId: TldrawAppFileId): string {
	const host = isDevelopmentEnv ? 'http://localhost:3000' : 'https://tldraw.com'
	return `${host}/q/f/${getCleanId(fileId)}`
}
