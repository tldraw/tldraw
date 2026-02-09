import type { PortableTextBlock } from '@portabletext/react'

// Shared types
export interface SanityImage {
	asset: {
		_ref: string
		_type: 'reference'
	}
	alt?: string
}

export interface Seo {
	metaTitle?: string
	metaDescription?: string
	ogImage?: SanityImage
}

export interface CtaBlock {
	label: string
	url: string
	variant: 'primary' | 'secondary'
}

// Document types
export interface BlogPost {
	_id: string
	_type: 'blogPost'
	title: string
	slug: { current: string }
	excerpt: string
	body: PortableTextBlock[]
	coverImage: SanityImage
	author: Author
	category: BlogCategory
	publishedAt: string
	seo?: Seo
}

export interface BlogCategory {
	_id: string
	_type: 'blogCategory'
	title: string
	slug: { current: string }
	description?: string
}

export interface Author {
	_id: string
	_type: 'author'
	name: string
	slug: { current: string }
	bio?: string
	avatar?: SanityImage
	role?: string
	socialLinks?: { platform: string; url: string }[]
}

export interface TeamMember {
	_id: string
	_type: 'teamMember'
	name: string
	role: string
	bio?: string
	avatar?: SanityImage
	socialLinks?: { platform: string; url: string }[]
	order: number
}

export interface JobListing {
	_id: string
	_type: 'jobListing'
	title: string
	department: string
	location: string
	type: 'full-time' | 'contract' | 'part-time'
	description: PortableTextBlock[]
	applyUrl: string
	isActive: boolean
}

export interface Event {
	_id: string
	_type: 'event'
	title: string
	date: string
	location: string
	description?: string
	url?: string
	coverImage?: SanityImage
	isUpcoming: boolean
}

export interface FaqItem {
	_id: string
	_type: 'faqItem'
	question: string
	answer: PortableTextBlock[]
	category?: string
	order: number
}

export interface FeaturePage {
	_id: string
	_type: 'featurePage'
	title: string
	slug: { current: string }
	description: string
	body: PortableTextBlock[]
	icon?: string
	coverImage?: SanityImage
	seo?: Seo
}

export interface CaseStudy {
	_id: string
	_type: 'caseStudy'
	title: string
	slug: { current: string }
	company: string
	logo?: SanityImage
	excerpt: string
	body: PortableTextBlock[]
	coverImage?: SanityImage
	testimonial?: Testimonial
}

export interface Testimonial {
	_id: string
	_type: 'testimonial'
	quote: string
	author: string
	role: string
	company: string
	avatar?: SanityImage
}

export interface PricingTier {
	_id: string
	_type: 'pricingTier'
	name: string
	price: string
	period?: string
	description: string
	features: string[]
	ctaLabel: string
	ctaUrl: string
	isHighlighted: boolean
	order: number
}

export interface LegalPage {
	_id: string
	_type: 'legalPage'
	title: string
	slug: { current: string }
	body: PortableTextBlock[]
	lastUpdated: string
}

export interface Page {
	_id: string
	_type: 'page'
	title: string
	slug: { current: string }
	body: PortableTextBlock[]
	seo?: Seo
}

// Singleton types
export interface Homepage {
	_id: string
	_type: 'homepage'
	hero: {
		title: string
		subtitle: string
		ctaPrimary: CtaBlock
		ctaSecondary?: CtaBlock
		heroImage?: SanityImage
	}
	features: {
		title: string
		description: string
		icon?: string
	}[]
	testimonials: Testimonial[]
	showcaseSection?: {
		title: string
		items: CaseStudy[]
	}
	ctaSection?: {
		title: string
		description: string
		cta: CtaBlock
	}
}

export interface PricingPage {
	_id: string
	_type: 'pricingPage'
	title: string
	subtitle?: string
	tiers: PricingTier[]
	faqItems?: FaqItem[]
	contactCta?: CtaBlock
}

export interface CompanyPage {
	_id: string
	_type: 'companyPage'
	title: string
	intro?: string
	mission?: string
	team: TeamMember[]
	values?: { title: string; description: string }[]
}

export interface SiteSettings {
	_id: string
	_type: 'siteSettings'
	logo?: SanityImage
	navLinks: { label: string; url: string }[]
	footerLinks: { heading: string; links: { label: string; url: string }[] }[]
	socialLinks: { platform: string; url: string }[]
}
