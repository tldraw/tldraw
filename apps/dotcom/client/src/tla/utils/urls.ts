import { getCleanId } from './tldrawAppSchema'

export function getFileUrl(fileId: string): string {
	return `/q/f/${getCleanId(fileId)}`
}
