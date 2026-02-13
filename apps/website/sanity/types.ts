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

export interface FaqSectionDoc {
	_id: string
	_type: 'faqSection'
	heading: string
	description: string
	slug: { current: string }
	items: FaqItem[]
	order: number
}

export interface FeaturePageChild {
	_key: string
	title: string
	description: string
	slug: string
}

export interface FeaturePage {
	_id: string
	_type: 'featurePage'
	title: string
	slug: { current: string }
	description: string
	body: PortableTextBlock[]
	icon?: string
	category?: 'featured' | 'group' | 'capability'
	parentGroup?: string
	eyebrow?: string
	heroSubtitle?: string
	children?: FeaturePageChild[]
	order?: number
	coverImage?: SanityImage
	seo?: Seo
}

// Feature page custom block types
export interface IconGridItem {
	_key: string
	icon?: string
	title: string
	description?: string
}

export interface IconGridBlock {
	_type: 'iconGrid'
	_key: string
	heading?: string
	subtitle?: string
	columns?: 2 | 3 | 4
	items?: IconGridItem[]
	sideImage?: SanityImage
}

export interface ImageCardRowCard {
	_key: string
	image?: SanityImage
	icon?: string
	title: string
	description?: string
}

export interface ImageCardRowBlock {
	_type: 'imageCardRow'
	_key: string
	cards?: ImageCardRowCard[]
}

export interface BenefitCard {
	_key: string
	icon?: string
	title: string
	description?: string
	bullets?: string[]
	linkLabel?: string
	linkUrl?: string
}

export interface BenefitCardsBlock {
	_type: 'benefitCards'
	_key: string
	heading?: string
	cards?: BenefitCard[]
}

export interface ShowcaseEntryDoc {
	_id: string
	_type: 'showcaseEntry'
	name: string
	slug: { current: string }
	category: string
	description: string
	url: string
	caseStudyUrl?: string
	logo?: SanityImage
	coverImage?: SanityImage
	order?: number
}

export interface ShowcaseProject {
	_key: string
	name: string
	description: string
	url: string
	linkLabel?: string
	coverImage?: SanityImage
}

export interface ShowcaseCaseStudySummary {
	_key: string
	heading: string
	description: string
	url: string
}

export interface ShowcasePage {
	_id: string
	_type: 'showcasePage'
	heroTitle: string
	heroSubtitle?: string
	logoBarEntries?: ShowcaseEntryDoc[]
	showcaseTitle?: string
	showcaseSubtitle?: string
	showAndTellTitle?: string
	showAndTellDescription?: string
	projectsTitle?: string
	projectsSubtitle?: string
	projects?: ShowcaseProject[]
	testimonial?: Testimonial
	caseStudySummaries?: ShowcaseCaseStudySummary[]
	ctaTitle?: string
	ctaDescription?: string
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
	useInPullQuote?: boolean
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

// Shared sub-types for homepage sections
export interface HomepageCta {
	label: string
	url: string
	variant?: 'code'
	labelBold?: string
}

export interface HomepageShowcaseItem {
	_key: string
	company: string
	category: string
	description: string
	url: string
}

export interface HomepageCaseStudy {
	_key: string
	company: string
	description: string
	url: string
}

// Singleton types
export interface Homepage {
	_id: string
	_type: 'homepage'
	hero?: {
		title: string
		subtitle: string
		subtitleHighlight?: string
		ctaPrimary: HomepageCta
		ctaSecondary?: HomepageCta
	}
	logoBar?: Record<string, never>
	whyTldraw?: {
		title: string
		items: { _key: string; title: string; description: string }[]
	}
	showcaseSection?: {
		title: string
		subtitle: string
		ctaLabel: string
		ctaUrl: string
		items: HomepageShowcaseItem[]
	}
	whatsInside?: {
		title: string
		subtitle: string
		items: { _key: string; icon: string; title: string; description: string; url: string }[]
	}
	whiteboardKit?: {
		eyebrow: string
		title: string
		description: string
		ctaLabel: string
		ctaUrl: string
		features: { _key: string; title: string; description: string }[]
	}
	starterKits?: {
		title: string
		subtitle: string
		ctaLabel: string
		ctaUrl: string
		kits: { _key: string; title: string; description: string; url: string }[]
	}
	testimonialSection?: {
		caseStudies: HomepageCaseStudy[]
	}
	finalCta?: {
		title: string
		description: string
		descriptionBold: string
		ctaPrimary: HomepageCta
		ctaSecondary: HomepageCta
	}
}

export interface PricingPage {
	_id: string
	_type: 'pricingPage'
	title: string
	subtitle?: string
	sdkLicense?: {
		title: string
		description: string
		features: string[]
		ctaPrimary: { label: string; url: string; note?: string }
		ctaSecondary: { label: string; url: string }
	}
	premiumNote?: {
		text: string
		linkLabel: string
		linkUrl: string
	}
	startupCard?: {
		title: string
		description: string
		ctaLabel: string
		ctaUrl: string
	}
	hobbyCard?: {
		description: string
		ctaLabel: string
		ctaUrl: string
	}
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

export interface NavItem {
	_key: string
	label: string
	href: string
}

export interface NavGroup {
	_key: string
	label: string
	items: NavItem[]
}

export interface FooterColumn {
	_key: string
	heading: string
	links: NavItem[]
}

export interface SiteSettings {
	_id: string
	_type: 'siteSettings'
	logo?: SanityImage
	navGroups?: NavGroup[]
	standaloneNavLinks?: NavItem[]
	footerTagline?: string
	footerColumns?: FooterColumn[]
	socialLinks?: NavItem[]
}
