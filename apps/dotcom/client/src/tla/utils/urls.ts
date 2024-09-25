import { isDevelopmentEnv } from '../../utils/env'
import { TldrawAppFileId } from './schema/TldrawAppFile'
import { TldrawAppUserId } from './schema/TldrawAppUser'
import { TldrawAppWorkspaceId } from './schema/TldrawAppWorkspace'
import { getCleanId } from './tldrawAppSchema'

export function getFileUrl(workspaceId: TldrawAppWorkspaceId, fileId: TldrawAppFileId): string {
	return `/q/w/${getCleanId(workspaceId)}/f/${getCleanId(fileId)}`
}

export function getPageUrl(workspaceId: TldrawAppWorkspaceId, pageId: string): string {
	return `/q/w/${getCleanId(workspaceId)}/${pageId}`
}

export function getUserUrl(userId: TldrawAppUserId): string {
	return `/q/u/${getCleanId(userId)}`
}

export function getWorkspaceUrl(workspaceId: TldrawAppWorkspaceId): string {
	return `/q/w/${getCleanId(workspaceId)}`
}

export function getDebugUrl(workspaceId: TldrawAppWorkspaceId): string {
	return `/q/w/${getCleanId(workspaceId)}/debug`
}

export function getShareableFileUrl(
	workspaceId: TldrawAppWorkspaceId,
	fileId: TldrawAppFileId
): string {
	const host = isDevelopmentEnv ? 'http://localhost:3000' : 'https://tldraw.com'
	return `${host}/q/w/${getCleanId(workspaceId)}/f/${getCleanId(fileId)}`
}
