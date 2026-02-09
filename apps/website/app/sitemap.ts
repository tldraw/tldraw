import { getBlogPosts, getFeaturePages } from '@/sanity/queries'
import type { MetadataRoute } from 'next'

const BASE_URL = 'https://tldraw.dev'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [posts, features] = await Promise.all([getBlogPosts(), getFeaturePages()])

	const staticPages: MetadataRoute.Sitemap = [
		{ url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
		{ url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.8 },
		{ url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
		{ url: `${BASE_URL}/features`, changeFrequency: 'weekly', priority: 0.8 },
		{ url: `${BASE_URL}/showcase`, changeFrequency: 'weekly', priority: 0.7 },
		{ url: `${BASE_URL}/company`, changeFrequency: 'monthly', priority: 0.6 },
		{ url: `${BASE_URL}/careers`, changeFrequency: 'weekly', priority: 0.6 },
		{ url: `${BASE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
		{ url: `${BASE_URL}/events`, changeFrequency: 'weekly', priority: 0.6 },
		{ url: `${BASE_URL}/partner`, changeFrequency: 'monthly', priority: 0.5 },
		{ url: `${BASE_URL}/accessibility`, changeFrequency: 'yearly', priority: 0.4 },
		{ url: `${BASE_URL}/get-a-license`, changeFrequency: 'monthly', priority: 0.7 },
	]

	const blogPages: MetadataRoute.Sitemap =
		posts?.map((post) => ({
			url: `${BASE_URL}/blog/${post.slug.current}`,
			lastModified: post.publishedAt,
			changeFrequency: 'monthly' as const,
			priority: 0.7,
		})) || []

	const featurePages: MetadataRoute.Sitemap =
		features?.map((f) => ({
			url: `${BASE_URL}/features/${f.slug.current}`,
			changeFrequency: 'monthly' as const,
			priority: 0.7,
		})) || []

	return [...staticPages, ...blogPages, ...featurePages]
}
