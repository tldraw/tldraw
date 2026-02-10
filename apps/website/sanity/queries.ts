import { client } from './client'
import type {
	BlogCategory,
	BlogPost,
	CaseStudy,
	CompanyPage,
	Event,
	FaqItem,
	FaqSectionDoc,
	FeaturePage,
	FeaturePageChild,
	Homepage,
	JobListing,
	LegalPage,
	Page,
	PricingPage,
	ShowcaseEntryDoc,
	ShowcasePage,
	SiteSettings,
	Testimonial,
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
			_id,
			_type,
			logo,
			navGroups,
			standaloneNavLinks,
			footerTagline,
			footerColumns,
			socialLinks,
		}`
	)
}

// Homepage
export async function getHomepage(): Promise<Homepage | null> {
	return fetchOrNull(
		`*[_type == "homepage"][0]{
			...
		}`
	)
}

// Shared sections used across multiple pages (community, finalCta, testimonialSection)
export async function getSharedSections(): Promise<Pick<
	Homepage,
	'community' | 'testimonialSection' | 'finalCta'
> | null> {
	return fetchOrNull(
		`*[_type == "homepage"][0]{
			community,
			testimonialSection,
			finalCta,
		}`
	)
}

// Pull quote testimonials (random selection pool for testimonial section)
export async function getPullQuoteTestimonials(): Promise<Testimonial[]> {
	return fetchOrEmpty(
		`*[_type == "testimonial" && coalesce(useInPullQuote, true) == true] | order(_createdAt asc) {
			_id,
			_type,
			quote,
			author,
			role,
			company,
			avatar,
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
			...
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

export async function getFaqSections(): Promise<FaqSectionDoc[]> {
	return fetchOrEmpty(
		`*[_type == "faqSection"] | order(order asc) {
			_id,
			_type,
			heading,
			description,
			slug,
			"items": items[]->{ _id, _type, question, answer, category, order },
			order
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
			category,
			order,
			coverImage,
		}`
	)
}

export async function getFeaturePagesByCategory(): Promise<FeaturePage[]> {
	return fetchOrEmpty(
		`*[_type == "featurePage"] | order(order asc) {
			_id,
			title,
			slug,
			description,
			icon,
			category,
			parentGroup,
			eyebrow,
			heroSubtitle,
			children,
			order,
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

export async function getFeaturePageByParentAndSlug(
	parentGroup: string,
	slug: string
): Promise<FeaturePage | null> {
	// First try to find a standalone capability document
	const standalone = await fetchOrNull<FeaturePage>(
		`*[_type == "featurePage" && parentGroup == $parentGroup && slug.current == $slug][0]{
			...
		}`,
		{ parentGroup, slug }
	)
	if (standalone) return standalone

	// Fall back to the embedded child in the parent group document
	const result = await fetchOrNull<{ parent: FeaturePage; child: FeaturePageChild }>(
		`*[_type == "featurePage" && category == "group" && slug.current == $parentGroup][0]{
			"parent": { ... },
			"child": children[slug == $slug][0]
		}`,
		{ parentGroup, slug }
	)
	if (!result?.child) return null

	// Synthesize a FeaturePage from the embedded child data
	return {
		_id: result.parent._id + ':' + result.child.slug,
		_type: 'featurePage',
		title: result.child.title,
		slug: { current: result.child.slug },
		description: result.child.description,
		body: [],
		category: 'capability',
		parentGroup,
	}
}

export async function getFeatureChildPages(parentGroup: string): Promise<FeaturePage[]> {
	return fetchOrEmpty(
		`*[_type == "featurePage" && parentGroup == $parentGroup] | order(order asc) {
			_id, title, slug, description, parentGroup, order
		}`,
		{ parentGroup }
	)
}

// Logo bar (from showcase page, used on homepage and showcase)
export async function getLogoBarEntries(): Promise<ShowcaseEntryDoc[]> {
	const page = await fetchOrNull<{ logoBarEntries: ShowcaseEntryDoc[] }>(
		`*[_type == "showcasePage"][0]{
			"logoBarEntries": logoBarEntries[]->{ _id, _type, name, slug, logo },
		}`
	)
	return page?.logoBarEntries ?? []
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

export async function getShowcaseEntries(): Promise<ShowcaseEntryDoc[]> {
	return fetchOrEmpty(
		`*[_type == "showcaseEntry"] | order(order asc) {
			...
		}`
	)
}

export async function getShowcasePage(): Promise<ShowcasePage | null> {
	return fetchOrNull(
		`*[_type == "showcasePage"][0]{
			...,
			"logoBarEntries": logoBarEntries[]->{ _id, name, slug, logo },
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
