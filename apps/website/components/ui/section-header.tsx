interface SectionHeaderProps {
	title: string
	description?: string
	centered?: boolean
}

export function SectionHeader({ title, description, centered = true }: SectionHeaderProps) {
	return (
		<div className={centered ? 'mx-auto max-w-2xl text-center' : ''}>
			<h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
				{title}
			</h2>
			{description && (
				<p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{description}</p>
			)}
		</div>
	)
}
