import { db } from '@/utils/ContentDatabase'
import { MetadataRoute } from 'next'

async function fetchFramerSitemap(
	docsSitemap: MetadataRoute.Sitemap
): Promise<MetadataRoute.Sitemap> {
	try {
		const response = await fetch('https://tldrawdotdev.framer.website/sitemap.xml')
		if (!response.ok) {
			console.warn('Failed to fetch Framer sitemap:', response.statusText)
			return []
		}

		const xmlText = await response.text()

		// Parse the XML sitemap
		const urlRegex = /<url>\s*<loc>(.*?)<\/loc>(?:\s*<lastmod>(.*?)<\/lastmod>)?\s*<\/url>/g
		const sitemapEntries: MetadataRoute.Sitemap = []

		let match
		while ((match = urlRegex.exec(xmlText)) !== null) {
			sitemapEntries.push({
				url: match[1],
			})
		}

		// Filter out any Framer URLs that might conflict with docs routes
		const filteredFramerSitemap = sitemapEntries.filter((entry) => {
			const path = new URL(entry.url).pathname
			// Exclude root path and any paths that start with docs routes
			return (
				path !== '/' &&
				!docsSitemap.some((docsEntry) => {
					const docsPath = new URL(docsEntry.url).pathname
					return path === docsPath || (docsPath !== '/' && path.startsWith(docsPath))
				})
			)
		})

		return filteredFramerSitemap
	} catch (error) {
		console.warn('Error fetching Framer sitemap:', error)
		return []
	}
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const paths = await db.getAllPaths()

	const docsSitemap: MetadataRoute.Sitemap = [
		{
			url: 'https://tldraw.dev/',
			lastModified: new Date(),
		},
		...paths.map((path: string) => ({
			url: 'https://tldraw.dev' + path,
			lastModified: new Date(),
		})),
	]

	const framerSitemap = await fetchFramerSitemap(docsSitemap)

	return [...docsSitemap, ...framerSitemap]
}
