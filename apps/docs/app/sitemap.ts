import { db } from '@/utils/ContentDatabase'
import { fetchFramerPaths } from '@/utils/framer-sitemap'
import { MetadataRoute } from 'next'

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

	const framerPaths = await fetchFramerPaths()
	const docsPaths = new Set(paths.map((p: string) => p.toLowerCase()))
	const framerSitemap: MetadataRoute.Sitemap = []

	for (const path of framerPaths) {
		// Filter out root path and any paths that conflict with docs routes
		if (path === '/') continue
		if (docsPaths.has(path.toLowerCase())) continue
		framerSitemap.push({ url: 'https://tldraw.dev' + path })
	}

	return [...docsSitemap, ...framerSitemap]
}
