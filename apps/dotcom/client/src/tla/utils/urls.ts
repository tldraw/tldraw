import { PREFIX } from '../../routes'

export const PATH = {
	root: `/${PREFIX.tla}`,
	debug: `/${PREFIX.tla}/debug`,
	profile: `/${PREFIX.tla}/profile`,
	getFilePath(fileId: string): string {
		return `/${PREFIX.tla}/${PREFIX.file}/${fileId.split(':').pop()}`
	},
	getPublishPath(publishSlug: string): string {
		return `/${PREFIX.tla}/${PREFIX.publish}/${publishSlug}`
	},
}

export function getShareableFileUrl(fileId: string): string {
	return `${window.location.origin}${PATH.getFilePath(fileId)}`
}

export function getShareablePublishUrl(publishSlug: string): string {
	return `${window.location.origin}${PATH.getPublishPath(publishSlug)}`
}
