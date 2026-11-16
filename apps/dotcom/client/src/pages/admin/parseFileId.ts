const FILE_ID = /^[a-zA-Z0-9_-]+$/

/**
 * Reads a file ID from a bare ID or a tldraw.com /f/ or /r/ link. Returns null for anything else,
 * including /p/ and /ro/ links, whose slugs are not file IDs.
 */
export function parseFileId(input: string): string | null {
	const trimmed = input.trim()
	if (FILE_ID.test(trimmed)) return trimmed
	let url: URL
	try {
		url = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`)
	} catch {
		return null
	}
	const id = url.pathname.match(/^\/(?:f|r)\/([^/]+)/)?.[1]
	return id && FILE_ID.test(id) ? id : null
}
