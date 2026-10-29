import { FILE_PREFIX } from './routes'

/**
 * A file's `createSource`: `<prefix>/<id>`, and for a duplicated version `f/<id>@<iso>`. `@` keeps
 * the two-part `/` split that older readers rely on.
 */
export function parseCreateSource(
	source: string
): { prefix: string; id: string; versionTs: string | null } | null {
	const parts = source.split('/')
	if (parts.length !== 2) return null
	const [prefix, rest] = parts
	const at = rest.indexOf('@')
	if (at === -1) return { prefix, id: rest, versionTs: null }
	return { prefix, id: rest.slice(0, at), versionTs: rest.slice(at + 1) }
}

export function formatFileVersionSource(fileId: string, ts: string) {
	return `${FILE_PREFIX}/${fileId}@${ts}`
}
