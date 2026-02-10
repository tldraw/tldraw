import { ActionLink } from '@/components/ui/action-link'
import { Card } from '@/components/ui/card'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

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
		<Section>
			<SectionHeading title={title} description={subtitle} />
			<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{items.map((item) => (
					<Card key={item.title} className="flex gap-4">
						<div className="mt-0.5">{ICON}</div>
						<div className="min-w-0">
							<h3 className="text-lg font-semibold text-black dark:text-white">{item.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-body dark:text-zinc-400">
								{item.description}
							</p>
							<ActionLink href={item.url} underline className="mt-4">
								Learn more
							</ActionLink>
						</div>
					</Card>
				))}
			</div>
		</Section>
	)
}
