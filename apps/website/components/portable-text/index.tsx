import { Card } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { cn } from '@/lib/utils'
import { urlFor } from '@/sanity/image'
import type {
	BenefitCard,
	BenefitCardsBlock,
	IconGridBlock,
	IconGridItem,
	ImageCardRowBlock,
	ImageCardRowCard,
} from '@/sanity/types'
import type { PortableTextBlock } from '@portabletext/react'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import {
	ArrowRight,
	Compass,
	DiamondPlus,
	Eraser,
	FileText,
	Focus,
	Fullscreen,
	Grid3x3,
	Hand,
	HardDrive,
	Image as ImageIcon,
	type LucideIcon,
	Map,
	MousePointer,
	Move,
	Pencil,
	PenLine,
	Ruler,
	Shapes,
	Sparkles,
	StickyNote,
	Type,
	Users,
	Video,
	Wrench,
	Zap,
	ZoomIn,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const ICONS: Record<string, LucideIcon> = {
	'mouse-pointer': MousePointer,
	hand: Hand,
	pencil: Pencil,
	eraser: Eraser,
	'arrow-right': ArrowRight,
	type: Type,
	'sticky-note': StickyNote,
	shapes: Shapes,
	'file-text': FileText,
	'pen-line': PenLine,
	users: Users,
	'zoom-in': ZoomIn,
	compass: Compass,
	ruler: Ruler,
	map: Map,
	focus: Focus,
	'grid-3x3': Grid3x3,
	'diamond-plus': DiamondPlus,
	move: Move,
	video: Video,
	image: ImageIcon,
	sparkles: Sparkles,
	zap: Zap,
	'hard-drive': HardDrive,
	wrench: Wrench,
	fullscreen: Fullscreen,
}

const components: PortableTextComponents = {
	types: {
		image: ({ value }: { value: { asset: { _ref: string }; alt?: string; caption?: string } }) => {
			return (
				<figure className="my-8">
					<Image
						src={urlFor(value).width(1200).url()}
						alt={value.alt || ''}
						width={1200}
						height={675}
						className="rounded-md"
					/>
					{value.caption && (
						<figcaption className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
							{value.caption}
						</figcaption>
					)}
				</figure>
			)
		},
		code: ({ value }: { value: { code: string; language?: string; caption?: string } }) => {
			return <CodeBlock code={value.code} language={value.language} caption={value.caption} />
		},
		callout: ({ value }: { value: { text: string; tone?: string } }) => {
			return (
				<div className="my-6 rounded-md border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30">
					<p className="text-sm text-blue-800 dark:text-blue-200">{value.text}</p>
				</div>
			)
		},
		youtube: ({ value }: { value: { url: string } }) => {
			const videoId = value.url.match(
				/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/
			)?.[1]
			if (!videoId) return null
			return (
				<div className="my-8 aspect-video overflow-hidden rounded-md">
					<iframe
						src={`https://www.youtube.com/embed/${videoId}`}
						title="YouTube video"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						className="h-full w-full"
					/>
				</div>
			)
		},
		iconGrid: ({ value }: { value: IconGridBlock }) => {
			const cols = value.columns ?? 4
			const colClass =
				cols === 2
					? 'sm:grid-cols-2'
					: cols === 3
						? 'sm:grid-cols-2 lg:grid-cols-3'
						: 'sm:grid-cols-2 lg:grid-cols-4'
			return (
				<div className="not-prose my-10">
					{(value.heading || value.subtitle) && (
						<div className="mb-6">
							{value.heading && (
								<h3 className="text-lg font-semibold text-black dark:text-white">
									{value.heading}
								</h3>
							)}
							{value.subtitle && (
								<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{value.subtitle}</p>
							)}
						</div>
					)}
					<div className={value.sideImage ? 'flex flex-col gap-6 lg:flex-row' : ''}>
						<div className={cn('grid gap-4', colClass, value.sideImage && 'flex-1')}>
							{value.items?.map((item: IconGridItem) => {
								const Icon = item.icon ? ICONS[item.icon] : undefined
								return (
									<Card key={item._key} className="p-4">
										{Icon && (
											<Icon className="mb-2 h-5 w-5 text-black dark:text-white" strokeWidth={2} />
										)}
										<h4 className="text-sm font-semibold text-black dark:text-white">
											{item.title}
										</h4>
										{item.description && (
											<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
												{item.description}
											</p>
										)}
									</Card>
								)
							})}
						</div>
						{value.sideImage && (
							<div className="w-full lg:w-80">
								<Image
									src={urlFor(value.sideImage).width(640).url()}
									alt={value.sideImage.alt || ''}
									width={640}
									height={400}
									className="rounded-md"
								/>
							</div>
						)}
					</div>
				</div>
			)
		},
		imageCardRow: ({ value }: { value: ImageCardRowBlock }) => {
			return (
				<div className="not-prose my-10">
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{value.cards?.map((card: ImageCardRowCard) => {
							const Icon = card.icon ? ICONS[card.icon] : undefined
							return (
								<Card key={card._key} className="overflow-hidden p-0">
									{card.image && (
										<Image
											src={urlFor(card.image).width(800).url()}
											alt={card.image.alt || card.title}
											width={800}
											height={450}
											className="w-full"
										/>
									)}
									<div className="p-5">
										{Icon && (
											<Icon className="mb-2 h-5 w-5 text-black dark:text-white" strokeWidth={2} />
										)}
										<h4 className="text-sm font-semibold text-black dark:text-white">
											{card.title}
										</h4>
										{card.description && (
											<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
												{card.description}
											</p>
										)}
									</div>
								</Card>
							)
						})}
					</div>
				</div>
			)
		},
		benefitCards: ({ value }: { value: BenefitCardsBlock }) => {
			return (
				<div className="not-prose my-10">
					{value.heading && (
						<h3 className="mb-6 text-lg font-semibold text-black dark:text-white">
							{value.heading}
						</h3>
					)}
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{value.cards?.map((card: BenefitCard) => {
							const Icon = card.icon ? ICONS[card.icon] : undefined
							return (
								<Card key={card._key} className="flex flex-col p-5">
									{Icon && (
										<Icon className="mb-3 h-5 w-5 text-black dark:text-white" strokeWidth={2} />
									)}
									<h4 className="text-sm font-semibold text-black dark:text-white">{card.title}</h4>
									{card.description && (
										<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
											{card.description}
										</p>
									)}
									{card.bullets && card.bullets.length > 0 && (
										<ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-zinc-600 dark:text-zinc-400">
											{card.bullets.map((bullet, i) => (
												<li key={i}>{bullet}</li>
											))}
										</ul>
									)}
									{card.linkLabel && card.linkUrl && (
										<Link
											href={card.linkUrl}
											className="text-brand-blue mt-auto pt-3 text-sm font-medium hover:underline"
										>
											{card.linkLabel} &rarr;
										</Link>
									)}
								</Card>
							)
						})}
					</div>
				</div>
			)
		},
	},
	marks: {
		link: ({ children, value }: { children: React.ReactNode; value?: { href: string } }) => {
			const href = value?.href || ''
			const isExternal = href.startsWith('http')
			return (
				<a
					href={href}
					className="text-brand-link decoration-brand-link/30 hover:text-brand-link/90 dark:text-brand-link dark:decoration-brand-link/30 dark:hover:text-brand-link/90 underline transition-colors"
					{...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
				>
					{children}
				</a>
			)
		},
		code: ({ children }: { children: React.ReactNode }) => <code>{children}</code>,
	},
}

interface RichTextProps {
	value: PortableTextBlock[]
	className?: string
	/** Use 'feature' variant for feature pages to get 2-column grid layout */
	variant?: 'default' | 'feature'
}

export function RichText({ value, className, variant = 'default' }: RichTextProps) {
	return (
		<div
			className={cn(
				'prose prose-zinc dark:prose-invert max-w-none',
				variant === 'feature' && 'prose-feature',
				className
			)}
		>
			<PortableText value={value} components={components} />
		</div>
	)
}
