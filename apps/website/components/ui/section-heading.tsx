import { cn } from '@/lib/utils'

interface SectionHeadingProps {
	title: string
	description?: string
	eyebrow?: string
	align?: 'center'
	level?: 'h1' | 'h2' | 'h3'
}

export function SectionHeading({
	title,
	description,
	eyebrow,
	align,
	level = 'h2',
}: SectionHeadingProps) {
	const Tag = level

	return (
		<div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center')}>
			{eyebrow && (
				<p className="text-xs font-semibold uppercase tracking-widest text-brand-blue dark:text-blue-400">
					{eyebrow}
				</p>
			)}
			<Tag
				className={cn(
					'font-semibold text-black dark:text-white',
					level === 'h1' ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-3xl sm:text-4xl',
					eyebrow && 'mt-4'
				)}
			>
				{title}
			</Tag>
			{description && (
				<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">{description}</p>
			)}
		</div>
	)
}
