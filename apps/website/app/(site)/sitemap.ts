import { db } from '@/utils/ContentDatabase'
import type { MetadataRoute } from 'next'

const BASE_URL = 'https://tldraw.dev'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [blogPages, featurePages] = await Promise.all([
		db.getPagesBySection('blog'),
		db.getPagesBySection('features'),
	])

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

	const blogEntries: MetadataRoute.Sitemap = blogPages.map((post) => ({
		url: `${BASE_URL}${post.path}`,
		lastModified: post.date ?? undefined,
		changeFrequency: 'monthly' as const,
		priority: 0.7,
	}))

	const featureEntries: MetadataRoute.Sitemap = featurePages.map((f) => ({
		url: `${BASE_URL}${f.path}`,
		changeFrequency: 'monthly' as const,
		priority: 0.7,
	}))

	return [...staticPages, ...blogEntries, ...featureEntries]
}
