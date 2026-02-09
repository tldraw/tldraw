interface PageHeaderProps {
	title: string
	description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
	return (
		<div className="border-b border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-950 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
					{title}
				</h1>
				{description && (
					<p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">{description}</p>
				)}
			</div>
		</div>
	)
}
