/** A page record stored in the SQLite database. */
export interface PageRecord {
	id: string
	path: string
	title: string
	description: string | null
	/** Top-level route segment: 'blog', 'features', 'legal', 'homepage', etc. */
	section: string
	/** Layout key used to pick the rendering strategy. */
	layout: string
	status: 'published' | 'draft' | 'unlisted'
	date: string | null
	sortIndex: number
	hero: string | null
	/** Raw markdown body. */
	content: string
	/** JSON blob for page-specific structured data (parsed at the call-site). */
	metadata: string | null
}

/** A collection item record stored in the SQLite database. */
export interface CollectionItemRecord {
	id: string
	collection: string
	sortIndex: number
	title: string | null
	/** JSON-serialised string array used for filtering. */
	tags: string | null
	/** Optional markdown body. */
	content: string | null
	/** JSON blob containing all front matter fields. */
	data: string
}

/** A heading extracted from a page's markdown body. */
export interface HeadingRecord {
	id: number
	pageId: string
	level: number
	title: string
	slug: string
}

// ---------------------------------------------------------------------------
// Typed wrappers (after JSON parsing)
// ---------------------------------------------------------------------------

export interface CollectionItem<T = Record<string, unknown>> {
	id: string
	collection: string
	sortIndex: number
	title: string | null
	tags: string[]
	content: string | null
	data: T
}

// ---------------------------------------------------------------------------
// Per-collection data shapes (the `data` blob, typed)
// ---------------------------------------------------------------------------

export interface TestimonialData {
	quote: string
	author: string
	role: string
	company: string
	avatar?: string
	useInPullQuote?: boolean
}

export interface ShowcaseEntryData {
	name: string
	category: string
	description: string
	url: string
	caseStudyUrl?: string
	logo?: string
	coverImage?: string
}

export interface TeamMemberData {
	name: string
	role: string
	bio?: string
	avatar?: string
	socialLinks?: { platform: string; url: string }[]
}

export interface JobListingData {
	title: string
	department: string
	location: string
	type: 'full-time' | 'contract' | 'part-time'
	applyUrl: string
	isActive: boolean
}

export interface FaqItemData {
	question: string
	/** Markdown answer text. */
	answer: string
	section: string
	sectionHeading?: string
	sectionDescription?: string
}

export interface EventData {
	title: string
	date: string
	location: string
	description?: string
	url?: string
	coverImage?: string
	isUpcoming: boolean
}

export interface StarterKitData {
	title: string
	description: string
	url: string
}

export interface StatData {
	label: string
	value: string
	url?: string
}

export interface NavItemData {
	label: string
	href: string
	group?: string
	column?: string
	area: 'header' | 'footer' | 'social'
}

export interface LogoBarEntryData {
	name: string
	logo?: string
}

export interface BlogAuthorData {
	name: string
	avatar?: string
	role?: string
	bio?: string
}

export interface BlogCategoryData {
	title: string
	slug: string
	description?: string
}

// ---------------------------------------------------------------------------
// Navigation types (used by Header/Footer components)
// These mirror the shapes previously imported from sanity/types.
// ---------------------------------------------------------------------------

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

export interface SiteNavigation {
	navGroups: NavGroup[]
	standaloneNavLinks: NavItem[]
	footerTagline: string
	footerColumns: FooterColumn[]
	socialLinks: NavItem[]
}
