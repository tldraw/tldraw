interface WhyTldrawItem {
	title: string
	description: string
}

interface WhyTldrawGridProps {
	title: string
	items: WhyTldrawItem[]
}

export function WhyTldrawGrid({ title, items }: WhyTldrawGridProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">{title}</h2>
				<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{items.map((item) => (
						<div key={item.title}>
							<h3 className="text-lg font-semibold text-black dark:text-white">{item.title}</h3>
							<p className="mt-3 text-sm leading-relaxed text-body dark:text-zinc-400">
								{item.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
