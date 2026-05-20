import { MetadataRoute } from 'next'
import { db } from '@/utils/ContentDatabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const paths = await db.getAllPaths()

	// Docs-only sitemap. Marketing pages are now owned by the dotdev app.
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
	return docsSitemap
}
