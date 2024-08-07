/** @public */
export const safeParseUrl = (url: string) => {
	try {
		return new URL(url)
	} catch (err) {
		return
	}
}
