export const PREFIX = {
	tla: 'q',
	file: 'f',
	localFile: 'lf',
	publish: 'p',
}

export function buildUrl({ pathname }: { pathname: string }): string {
	return `/${PREFIX.tla}${pathname}`
}

export function getRootPath() {
	return buildUrl({ pathname: '/' })
}

export function getDebugPath() {
	return buildUrl({ pathname: '/debug' })
}

export function getProfilePath() {
	return buildUrl({ pathname: '/profile' })
}

export function getFilePath(fileSlug: string) {
	return buildUrl({ pathname: `/${PREFIX.file}/${fileSlug}` })
}

export function getLocalFilePath(persistenceKey: string) {
	return buildUrl({ pathname: `/${PREFIX.localFile}/${persistenceKey}` })
}

export function getPublishPath(publishSlug: string) {
	return buildUrl({ pathname: `/${PREFIX.publish}/${publishSlug}` })
}

function absoluteUrl(path: string) {
	return `${window.location.origin}${path}`
}

export function getShareableFileUrl(fileId: string): string {
	return absoluteUrl(getFilePath(fileId))
}

export function getShareablePublishUrl(publishSlug: string): string {
	return absoluteUrl(getPublishPath(publishSlug))
}
