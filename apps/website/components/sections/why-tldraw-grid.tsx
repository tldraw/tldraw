interface WhyTldrawItem {
	title: string
	description: string
}

interface WhyTldrawGridProps {
	title: string
	items: WhyTldrawItem[]
}

const ICONS = [
	// Canvas infrastructure - cube/package
	<svg
		key="0"
		className="h-5 w-5 shrink-0 text-black dark:text-white"
		fill="currentColor"
		viewBox="0 0 24 24"
	>
		<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
	</svg>,
	// Accelerate development - lightning/rocket
	<svg
		key="1"
		className="h-5 w-5 shrink-0 text-black dark:text-white"
		fill="none"
		viewBox="0 0 24 24"
		strokeWidth="1.5"
		stroke="currentColor"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
		/>
	</svg>,
	// Customize - wrench
	<svg
		key="2"
		className="h-5 w-5 shrink-0 text-black dark:text-white"
		fill="none"
		viewBox="0 0 24 24"
		strokeWidth="1.5"
		stroke="currentColor"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M11.42 15.17L4.588 8.335M18 13a6 6 0 11-12 0 6 6 0 0112 0zM7 21a4 4 0 100-8 4 4 0 000 8z"
		/>
	</svg>,
	// Get involved - people
	<svg
		key="3"
		className="h-5 w-5 shrink-0 text-black dark:text-white"
		fill="none"
		viewBox="0 0 24 24"
		strokeWidth="1.5"
		stroke="currentColor"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
		/>
	</svg>,
]

export function WhyTldrawGrid({ title, items }: WhyTldrawGridProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
				<h2 className="text-3xl font-semibold tracking-heading text-black dark:text-white sm:text-4xl">
					{title}
				</h2>
				<div className="mt-12 grid gap-x-12 gap-y-12 sm:grid-cols-2">
					{items.map((item, i) => (
						<div key={item.title} className="flex gap-4">
							<div className="mt-0.5">{ICONS[i % ICONS.length]}</div>
							<div>
								<h3 className="text-lg font-semibold text-black dark:text-white">{item.title}</h3>
								<p className="mt-3 text-sm leading-relaxed text-body dark:text-zinc-400">
									{item.description}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
