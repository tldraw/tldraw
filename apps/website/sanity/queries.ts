import { client } from './client'
import type {
	BlogCategory,
	BlogPost,
	CaseStudy,
	CompanyPage,
	Event,
	FaqItem,
	FeaturePage,
	Homepage,
	JobListing,
	LegalPage,
	Page,
	PricingPage,
	SiteSettings,
} from './types'

async function fetchOrNull<T>(query: string, params?: Record<string, string>): Promise<T | null> {
	if (!client) return null
	if (params) return client.fetch<T>(query, params)
	return client.fetch<T>(query)
}

async function fetchOrEmpty<T>(query: string, params?: Record<string, string>): Promise<T[]> {
	if (!client) return []
	if (params) return client.fetch<T[]>(query, params)
	return client.fetch<T[]>(query)
}

// Site settings
export async function getSiteSettings(): Promise<SiteSettings | null> {
	return fetchOrNull(
		`*[_type == "siteSettings"][0]{
			...,
		}`
	)
}

// Homepage
export async function getHomepage(): Promise<Homepage | null> {
	return fetchOrNull(
		`*[_type == "homepage"][0]{
			...,
			testimonials[]->,
			"showcaseSection": showcaseSection{
				title,
				"items": items[]->{ ..., testimonial-> }
			},
		}`
	)
}

// Blog
export async function getBlogPosts(category?: string): Promise<BlogPost[]> {
	const filter = category
		? `*[_type == "blogPost" && category->slug.current == $category]`
		: `*[_type == "blogPost"]`

	return fetchOrEmpty(
		`${filter} | order(publishedAt desc) {
			_id,
			title,
			slug,
			excerpt,
			coverImage,
			publishedAt,
			"author": author->{ name, slug, avatar },
			"category": category->{ title, slug },
		}`,
		category ? { category } : {}
	)
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
	return fetchOrNull(
		`*[_type == "blogPost" && slug.current == $slug][0]{
			...,
			"author": author->{ name, slug, bio, avatar, role },
			"category": category->{ title, slug },
		}`,
		{ slug }
	)
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
	return fetchOrEmpty(
		`*[_type == "blogCategory"] | order(title asc) {
			_id,
			title,
			slug,
			description,
		}`
	)
}

// Pricing
export async function getPricingPage(): Promise<PricingPage | null> {
	return fetchOrNull(
		`*[_type == "pricingPage"][0]{
			...,
			"tiers": tiers[]->{ ... } | order(order asc),
			"faqItems": faqItems[]->{ ... } | order(order asc),
		}`
	)
}

// Company
export async function getCompanyPage(): Promise<CompanyPage | null> {
	return fetchOrNull(
		`*[_type == "companyPage"][0]{
			...,
			"team": team[]->{ ... } | order(order asc),
		}`
	)
}

// Careers
export async function getJobListings(): Promise<JobListing[]> {
	return fetchOrEmpty(
		`*[_type == "jobListing" && isActive == true] | order(department asc, title asc) {
			...
		}`
	)
}

// Events
export async function getEvents(): Promise<Event[]> {
	return fetchOrEmpty(
		`*[_type == "event"] | order(date desc) {
			...
		}`
	)
}

// FAQ
export async function getFaqItems(): Promise<FaqItem[]> {
	return fetchOrEmpty(
		`*[_type == "faqItem"] | order(order asc) {
			...
		}`
	)
}

// Features
export async function getFeaturePages(): Promise<FeaturePage[]> {
	return fetchOrEmpty(
		`*[_type == "featurePage"] | order(title asc) {
			_id,
			title,
			slug,
			description,
			icon,
			coverImage,
		}`
	)
}

export async function getFeaturePage(slug: string): Promise<FeaturePage | null> {
	return fetchOrNull(
		`*[_type == "featurePage" && slug.current == $slug][0]{
			...
		}`,
		{ slug }
	)
}

// Showcase
export async function getCaseStudies(): Promise<CaseStudy[]> {
	return fetchOrEmpty(
		`*[_type == "caseStudy"] | order(_createdAt desc) {
			...,
			"testimonial": testimonial->,
		}`
	)
}

// Legal
export async function getLegalPage(slug: string): Promise<LegalPage | null> {
	return fetchOrNull(
		`*[_type == "legalPage" && slug.current == $slug][0]{
			...
		}`,
		{ slug }
	)
}

// Generic pages
export async function getPage(slug: string): Promise<Page | null> {
	return fetchOrNull(
		`*[_type == "page" && slug.current == $slug][0]{
			...
		}`,
		{ slug }
	)
}
