import { getCleanId } from './tldrawApp'

export function getFileUrl(workspaceId: string, fileId: string): string {
	return `/w/${getCleanId(workspaceId)}/f/${getCleanId(fileId)}`
}

export function getPageUrl(workspaceId: string, pageId: string): string {
	return `/w/${getCleanId(workspaceId)}/${pageId}`
}
