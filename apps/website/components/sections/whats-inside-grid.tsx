import Link from 'next/link'

interface WhatsInsideItem {
	title: string
	description: string
	url: string
}

interface WhatsInsideGridProps {
	title: string
	subtitle: string
	items: WhatsInsideItem[]
}

export function WhatsInsideGrid({ title, subtitle, items }: WhatsInsideGridProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-semibold text-black dark:text-white sm:text-4xl">{title}</h2>
					<p className="mt-4 text-lg text-body dark:text-zinc-400">{subtitle}</p>
				</div>
				<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<div
							key={item.title}
							className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
						>
							<h3 className="text-lg font-semibold text-black dark:text-white">{item.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
								{item.description}
							</p>
							<Link
								href={item.url}
								className="mt-4 inline-block text-sm font-medium text-brand-blue underline underline-offset-4 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
							>
								Learn More &rarr;
							</Link>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
