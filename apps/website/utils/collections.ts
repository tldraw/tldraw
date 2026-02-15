import type {
	CollectionItem,
	CollectionItemRecord,
	EventData,
	FaqItemData,
	FooterColumn,
	JobListingData,
	LogoBarEntryData,
	NavGroup,
	NavItem,
	NavItemData,
	ShowcaseEntryData,
	SiteNavigation,
	StarterKitData,
	StatData,
	TeamMemberData,
	TestimonialData,
} from '@/types/content-types'
import { db } from './ContentDatabase'

/** Parse a raw collection item record into a typed CollectionItem. */
function parseItem<T>(record: CollectionItemRecord): CollectionItem<T> {
	return {
		id: record.id,
		collection: record.collection,
		sortIndex: record.sortIndex,
		title: record.title,
		tags: record.tags ? JSON.parse(record.tags) : [],
		content: record.content,
		data: JSON.parse(record.data) as T,
	}
}

function parseItems<T>(records: CollectionItemRecord[]): CollectionItem<T>[] {
	return records.map((r) => parseItem<T>(r))
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export async function getTestimonials(tag?: string) {
	const items = tag
		? await db.getCollectionByTag('testimonials', tag)
		: await db.getCollection('testimonials')
	return parseItems<TestimonialData>(items)
}

export async function getRandomTestimonials(count: number, tag?: string) {
	const items = await db.getRandomFromCollection('testimonials', count, tag)
	return parseItems<TestimonialData>(items)
}

// ---------------------------------------------------------------------------
// Showcase
// ---------------------------------------------------------------------------

export async function getShowcaseEntries() {
	const items = await db.getCollection('showcase')
	return parseItems<ShowcaseEntryData>(items)
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export async function getTeamMembers() {
	const items = await db.getCollection('team')
	return parseItems<TeamMemberData>(items)
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function getJobListings(activeOnly = true) {
	const items = await db.getCollection('jobs')
	const parsed = parseItems<JobListingData>(items)
	if (activeOnly) return parsed.filter((j) => j.data.isActive)
	return parsed
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface FaqSection {
	heading: string
	description: string
	slug: string
	items: CollectionItem<FaqItemData>[]
}

export async function getFaqSections(): Promise<FaqSection[]> {
	const items = await db.getCollection('faqs')
	const parsed = parseItems<FaqItemData>(items)

	// Group by section
	const sectionMap = new Map<string, FaqSection>()
	for (const item of parsed) {
		const key = item.data.section
		if (!sectionMap.has(key)) {
			sectionMap.set(key, {
				heading: item.data.sectionHeading ?? key,
				description: item.data.sectionDescription ?? '',
				slug: key,
				items: [],
			})
		}
		sectionMap.get(key)!.items.push(item)
	}

	return Array.from(sectionMap.values())
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getEvents() {
	const items = await db.getCollection('events')
	return parseItems<EventData>(items)
}

// ---------------------------------------------------------------------------
// Starter kits
// ---------------------------------------------------------------------------

export async function getStarterKits() {
	const items = await db.getCollection('starter-kits')
	return parseItems<StarterKitData>(items)
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getStats() {
	const items = await db.getCollection('stats')
	return parseItems<StatData>(items)
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export async function getNavItems() {
	const items = await db.getCollection('nav')
	return parseItems<NavItemData>(items)
}

/** Build the full site navigation structure from the nav collection. */
export async function getNavigation(): Promise<SiteNavigation> {
	const allItems = await getNavItems()

	// Standalone header links (no group)
	const standaloneNavLinks: NavItem[] = allItems
		.filter((i) => i.data.area === 'header' && !i.data.group)
		.map((i) => ({ _key: i.id, label: i.data.label, href: i.data.href }))

	// Grouped header nav
	const groupMap = new Map<string, NavItem[]>()
	for (const item of allItems) {
		if (item.data.area === 'header' && item.data.group) {
			if (!groupMap.has(item.data.group)) groupMap.set(item.data.group, [])
			groupMap.get(item.data.group)!.push({
				_key: item.id,
				label: item.data.label,
				href: item.data.href,
			})
		}
	}
	const navGroups: NavGroup[] = Array.from(groupMap.entries()).map(([label, items]) => ({
		_key: `group-${label}`,
		label,
		items,
	}))

	// Footer columns
	const columnMap = new Map<string, NavItem[]>()
	for (const item of allItems) {
		if (item.data.area === 'footer' && item.data.column) {
			if (!columnMap.has(item.data.column)) columnMap.set(item.data.column, [])
			columnMap.get(item.data.column)!.push({
				_key: item.id,
				label: item.data.label,
				href: item.data.href,
			})
		}
	}
	const footerColumns: FooterColumn[] = Array.from(columnMap.entries()).map(([heading, links]) => ({
		_key: `col-${heading}`,
		heading,
		links,
	}))

	// Social links
	const socialLinks: NavItem[] = allItems
		.filter((i) => i.data.area === 'social')
		.map((i) => ({ _key: i.id, label: i.data.label, href: i.data.href }))

	return {
		navGroups,
		standaloneNavLinks,
		footerTagline: 'The infinite canvas SDK',
		footerColumns,
		socialLinks,
	}
}

// ---------------------------------------------------------------------------
// Blog helpers
// ---------------------------------------------------------------------------

export interface BlogPostSummary {
	id: string
	slug: string
	title: string
	excerpt: string
	coverImage?: string
	date: string
	category?: { title: string; slug: string }
	author?: { name: string; avatar?: string }
}

/** Convert a blog page record into a BlogPostSummary for card display. */
export function toBlogPostSummary(
	page: import('@/types/content-types').PageRecord
): BlogPostSummary {
	const meta = page.metadata ? JSON.parse(page.metadata) : {}
	const slug = page.path.replace('/blog/', '')
	return {
		id: page.id,
		slug,
		title: page.title,
		excerpt: meta.excerpt ?? page.description ?? '',
		coverImage: page.hero ?? undefined,
		date: page.date ?? '',
		category: meta.category ? { title: meta.category, slug: meta.category } : undefined,
		author: meta.author ? { name: meta.author, avatar: meta.authorAvatar } : undefined,
	}
}

/** Get all blog categories from published blog posts (derived, not a separate collection). */
export async function getBlogCategories(): Promise<{ id: string; title: string; slug: string }[]> {
	const posts = await db.getPagesBySection('blog')
	const categories = new Map<string, { id: string; title: string; slug: string }>()
	for (const post of posts) {
		const meta = post.metadata ? JSON.parse(post.metadata) : {}
		if (meta.category && !categories.has(meta.category)) {
			categories.set(meta.category, {
				id: meta.category,
				title: meta.category.charAt(0).toUpperCase() + meta.category.slice(1),
				slug: meta.category,
			})
		}
	}
	return Array.from(categories.values()).sort((a, b) => a.title.localeCompare(b.title))
}

// ---------------------------------------------------------------------------
// Logo bar
// ---------------------------------------------------------------------------

export async function getLogoBarEntries() {
	const items = await db.getCollection('logo-bar')
	return parseItems<LogoBarEntryData>(items)
}
