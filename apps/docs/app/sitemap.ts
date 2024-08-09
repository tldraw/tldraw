import { getAllPaths } from '@/utils/get-all-paths'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const paths = await getAllPaths()
	return [
		{
			url: 'https://tldraw.dev/',
			lastModified: new Date(),
		},
		...paths.map((path: string) => ({
			url: 'https://tldraw.dev' + path,
			lastModified: new Date(),
		})),
	]
}
