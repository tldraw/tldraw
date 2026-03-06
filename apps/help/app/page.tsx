import { getAllGuides, type Guide } from '@/lib/content'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
	title: 'How to use tldraw',
}

const SOCIAL_LINKS = [
	{ label: 'Discord', href: 'https://discord.tldraw.com/?utm_source=help' },
	{ label: 'Twitter / X', href: 'https://x.com/tldraw' },
	{ label: 'GitHub', href: 'https://github.com/tldraw/tldraw' },
	{ label: 'Bluesky', href: 'https://bsky.app/profile/tldraw.com' },
	{ label: 'LinkedIn', href: 'https://www.linkedin.com/company/tldraw/' },
]

const SECTION_META: Record<string, { description: string; hero: string }> = {
	'Shapes & drawing': {
		description:
			'Draw shapes, add text, create sticky notes, work with arrows, images, and frames.',
		hero: '/images/user-guides/section-drawing.gif',
	},
	Editing: {
		description:
			'Select, move, resize, rotate, and arrange shapes. Work with groups, alignment, and layers.',
		hero: '/images/user-guides/section-editing.gif',
	},
	'Navigation & view': {
		description: 'Zoom, pan, and navigate the infinite canvas with precision.',
		hero: '/images/user-guides/section-navigation.gif',
	},
	Sharing: {
		description:
			'Share files in real time, set viewer or editor access, and publish to a public URL.',
		hero: '/images/user-guides/section-sharing.gif',
	},
	'Your account': {
		description: 'Manage your files, recover drawings, and find answers to common questions.',
		hero: '/images/user-guides/section-account.gif',
	},
}

const SECTION_ORDER = [
	'Shapes & drawing',
	'Editing',
	'Navigation & view',
	'Sharing',
	'Your account',
]

function GuideLink({ guide }: { guide: Guide }) {
	return (
		<Link
			href={`/${guide.slug}`}
			className="group flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors"
		>
			<span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
				{guide.title}
			</span>
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 shrink-0 ml-3 transition-all group-hover:translate-x-0.5"
			>
				<path
					d="M3 8h10M9 4l4 4-4 4"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</Link>
	)
}

function HeroCard({
	name,
	guides,
	meta,
}: {
	name: string
	guides: Guide[]
	meta: { description: string; hero: string }
}) {
	const firstGuide = guides[0]
	const mid = Math.ceil(guides.length / 2)
	const col1 = guides.slice(0, mid)
	const col2 = guides.slice(mid)

	return (
		<div>
			<Link
				href={`/${firstGuide.slug}`}
				className="group block rounded-xl overflow-hidden mb-5 bg-zinc-100 dark:bg-zinc-800/60 aspect-video"
			>
				<img
					src={meta.hero}
					alt={name}
					className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
				/>
			</Link>
			<h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 text-lg">
				<Link
					href={`/${firstGuide.slug}`}
					className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
				>
					{name}
				</Link>
			</h2>
			<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
				{meta.description}
			</p>
			<div className="grid grid-cols-2 gap-x-6">
				<div>
					{col1.map((g) => (
						<GuideLink key={g.slug} guide={g} />
					))}
				</div>
				<div>
					{col2.map((g) => (
						<GuideLink key={g.slug} guide={g} />
					))}
				</div>
			</div>
		</div>
	)
}

function SmallCard({
	name,
	guides,
	meta,
}: {
	name: string
	guides: Guide[]
	meta: { description: string; hero: string }
}) {
	const firstGuide = guides[0]
	const shown = guides.slice(0, 4)
	const remaining = guides.length - shown.length

	return (
		<div>
			<Link
				href={`/${firstGuide.slug}`}
				className="group block rounded-xl overflow-hidden mb-4 bg-zinc-100 dark:bg-zinc-800/60 aspect-video"
			>
				<img
					src={meta.hero}
					alt={name}
					className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
				/>
			</Link>
			<h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 text-base">
				<Link
					href={`/${firstGuide.slug}`}
					className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
				>
					{name}
				</Link>
			</h2>
			<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
				{meta.description}
			</p>
			<div>
				{shown.map((g) => (
					<GuideLink key={g.slug} guide={g} />
				))}
				{remaining > 0 && (
					<Link
						href={`/${guides[shown.length].slug}`}
						className="group flex items-center gap-1.5 pt-2.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
					>
						+{remaining} more
					</Link>
				)}
			</div>
		</div>
	)
}

export default function HomePage() {
	const guides = getAllGuides()

	const sections = guides.reduce<Record<string, Guide[]>>((acc, guide) => {
		if (!acc[guide.section]) acc[guide.section] = []
		acc[guide.section].push(guide)
		return acc
	}, {})

	const orderedSections = SECTION_ORDER.filter((s) => sections[s]).map((s) => ({
		name: s,
		guides: sections[s],
		meta: SECTION_META[s] ?? { description: '', hero: '' },
	}))

	const featured = orderedSections.slice(0, 2)
	const secondary = orderedSections.slice(2)

	return (
		<div className="w-full max-w-screen-xl mx-auto px-5 pt-14 pb-24">
			{/* Hero */}
			<div className="mb-14 max-w-xl">
				<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
					How to use tldraw
				</h1>
				<p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
					Guides and how-tos for tldraw.com.
				</p>
				<p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mt-2">
					Visit{' '}
					<a
						href="https://tldraw.dev"
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
					>
						tldraw.dev
					</a>{' '}
					to learn about the tldraw SDK for developers.
				</p>
			</div>

			{/* Featured two sections */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
				{featured.map(({ name, guides: g, meta }) => (
					<HeroCard key={name} name={name} guides={g} meta={meta} />
				))}
			</div>

			{/* Secondary sections */}
			{secondary.length > 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 mb-20">
					{secondary.map(({ name, guides: g, meta }) => (
						<SmallCard key={name} name={name} guides={g} meta={meta} />
					))}
				</div>
			)}

			{/* Divider */}
			<div className="border-t border-zinc-100 dark:border-zinc-800 mb-10" />

			{/* Connect */}
			<div className="mb-10">
				<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
					Connect with tldraw
				</p>
				<div className="flex flex-wrap gap-x-6 gap-y-2">
					{SOCIAL_LINKS.map((link) => (
						<a
							key={link.href}
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
						>
							{link.label}
						</a>
					))}
				</div>
			</div>

			{/* SDK CTA */}
			<a
				href="https://tldraw.dev?utm_source=help&utm_medium=organic&utm_campaign=tldraw_guide"
				target="_blank"
				rel="noopener noreferrer"
				className="group inline-flex items-center gap-2 px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors"
			>
				Build with the tldraw SDK
				<svg
					width="12"
					height="12"
					viewBox="0 0 16 16"
					fill="none"
					className="text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform"
				>
					<path
						d="M3 8h10M9 4l4 4-4 4"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</a>
		</div>
	)
}
