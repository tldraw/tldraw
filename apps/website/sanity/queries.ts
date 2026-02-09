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

// Site settings
export async function getSiteSettings(): Promise<SiteSettings> {
	return client.fetch(
		`*[_type == "siteSettings"][0]{
			...,
		}`
	)
}

// Homepage
export async function getHomepage(): Promise<Homepage> {
	return client.fetch(
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

	return client.fetch(
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

export async function getBlogPost(slug: string): Promise<BlogPost> {
	return client.fetch(
		`*[_type == "blogPost" && slug.current == $slug][0]{
			...,
			"author": author->{ name, slug, bio, avatar, role },
			"category": category->{ title, slug },
		}`,
		{ slug }
	)
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
	return client.fetch(
		`*[_type == "blogCategory"] | order(title asc) {
			_id,
			title,
			slug,
			description,
		}`
	)
}

// Pricing
export async function getPricingPage(): Promise<PricingPage> {
	return client.fetch(
		`*[_type == "pricingPage"][0]{
			...,
			"tiers": tiers[]->{ ... } | order(order asc),
			"faqItems": faqItems[]->{ ... } | order(order asc),
		}`
	)
}

// Company
export async function getCompanyPage(): Promise<CompanyPage> {
	return client.fetch(
		`*[_type == "companyPage"][0]{
			...,
			"team": team[]->{ ... } | order(order asc),
		}`
	)
}

// Careers
export async function getJobListings(): Promise<JobListing[]> {
	return client.fetch(
		`*[_type == "jobListing" && isActive == true] | order(department asc, title asc) {
			...
		}`
	)
}

// Events
export async function getEvents(): Promise<Event[]> {
	return client.fetch(
		`*[_type == "event"] | order(date desc) {
			...
		}`
	)
}

// FAQ
export async function getFaqItems(): Promise<FaqItem[]> {
	return client.fetch(
		`*[_type == "faqItem"] | order(order asc) {
			...
		}`
	)
}

// Features
export async function getFeaturePages(): Promise<FeaturePage[]> {
	return client.fetch(
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

export async function getFeaturePage(slug: string): Promise<FeaturePage> {
	return client.fetch(
		`*[_type == "featurePage" && slug.current == $slug][0]{
			...
		}`,
		{ slug }
	)
}

// Showcase
export async function getCaseStudies(): Promise<CaseStudy[]> {
	return client.fetch(
		`*[_type == "caseStudy"] | order(_createdAt desc) {
			...,
			"testimonial": testimonial->,
		}`
	)
}

// Legal
export async function getLegalPage(slug: string): Promise<LegalPage> {
	return client.fetch(
		`*[_type == "legalPage" && slug.current == $slug][0]{
			...
		}`,
		{ slug }
	)
}

// Generic pages
export async function getPage(slug: string): Promise<Page> {
	return client.fetch(
		`*[_type == "page" && slug.current == $slug][0]{
			...
		}`,
		{ slug }
	)
}
