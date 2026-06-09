import { MetadataRoute } from 'next'
import { db } from '@/utils/ContentDatabase'
import { canonicalizeDocsSitemapPaths } from '@/utils/sitemap-canonical-paths'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const paths = canonicalizeDocsSitemapPaths(await db.getAllPaths())

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
