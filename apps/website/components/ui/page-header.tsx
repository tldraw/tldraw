interface PageHeaderProps {
	title: string
	description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
	return (
		<div className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<h1 className="text-4xl font-bold text-black dark:text-white sm:text-5xl lg:text-6xl">
					{title}
				</h1>
				{description && (
					<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">{description}</p>
				)}
			</div>
		</div>
	)
}
