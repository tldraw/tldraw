import { ChevronRight } from '@/components/ui/chevron-icon'
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

const ICON = (
	<svg
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
	</svg>
)

export function WhatsInsideGrid({ title, subtitle, items }: WhatsInsideGridProps) {
	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
				<div>
					<h2 className="text-3xl font-semibold tracking-heading text-black dark:text-white sm:text-4xl">
						{title}
					</h2>
					<p className="mt-4 max-w-2xl text-lg text-body dark:text-zinc-400">{subtitle}</p>
				</div>
				<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<div
							key={item.title}
							className="flex gap-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
						>
							<div className="mt-0.5">{ICON}</div>
							<div className="min-w-0">
								<h3 className="text-lg font-semibold text-black dark:text-white">{item.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
									{item.description}
								</p>
								<Link
									href={item.url}
									className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-link underline underline-offset-4 hover:text-brand-link/90 dark:hover:text-brand-link/90"
								>
									Learn more <ChevronRight />
								</Link>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
