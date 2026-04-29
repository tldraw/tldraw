const FRAMER_SITEMAP_URL = 'https://tldrawdotdev.framer.website/sitemap.xml'

/**
 * Fetch the Framer sitemap and return the set of pathname prefixes
 * (e.g. "/blog", "/pricing") that are served by Framer.
 */
export async function fetchFramerPaths(): Promise<Set<string>> {
	const paths = new Set<string>()

	try {
		const response = await fetch(FRAMER_SITEMAP_URL)
		if (!response.ok) {
			console.warn('Failed to fetch Framer sitemap:', response.statusText)
			return paths
		}

		const xmlText = await response.text()
		const urlRegex = /<url>\s*<loc>(.*?)<\/loc>/g

		let match
		while ((match = urlRegex.exec(xmlText)) !== null) {
			const pathname = new URL(match[1]).pathname
			paths.add(pathname)
		}
	} catch (error) {
		console.warn('Error fetching Framer sitemap:', error)
	}

	return paths
}
