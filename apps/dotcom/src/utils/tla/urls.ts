import { getCleanId } from './TldrawApp'

export function getFileUrl(workspaceId: string, fileId: string): string {
	return `/w/${getCleanId(workspaceId)}/f/${getCleanId(fileId)}`
}

export function getPageUrl(workspaceId: string, pageId: string): string {
	return `/w/${getCleanId(workspaceId)}/${pageId}`
}

export function getUserUrl(userId: string): string {
	return `/u/${getCleanId(userId)}`
}
