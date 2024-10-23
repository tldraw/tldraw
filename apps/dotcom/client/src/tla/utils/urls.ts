export function getFilePath(fileId: string): string {
	return `/q/f/${fileId.split(':').pop()}`
}

export function getShareableFileUrl(fileId: string): string {
	return `${window.location.origin}${getFilePath(fileId)}`
}

export function getShareablePublishUrl(publishSlug: string): string {
	return `${window.location.origin}/q/p/${publishSlug}`
}
