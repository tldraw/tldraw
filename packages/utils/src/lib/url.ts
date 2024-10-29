/** @public */
export const safeParseUrl = (url: string, baseUrl?: string | URL) => {
	try {
		return new URL(url, baseUrl)
	} catch {
		return
	}
}
