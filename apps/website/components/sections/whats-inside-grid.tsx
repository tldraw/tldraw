import { ActionLink } from '@/components/ui/action-link'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import {
	Accessibility,
	Database,
	LayoutGrid,
	type LucideIcon,
	MousePointerClick,
	Network,
	Users,
} from 'lucide-react'

interface WhatsInsideItem {
	icon?: string
	title: string
	description: string
	url: string
}

interface WhatsInsideGridProps {
	title: string
	subtitle: string
	items: WhatsInsideItem[]
}

const ICONS: Record<string, LucideIcon> = {
	users: Users,
	'mouse-pointer-click': MousePointerClick,
	accessibility: Accessibility,
	database: Database,
	'layout-grid': LayoutGrid,
	network: Network,
}

export function WhatsInsideGrid({ title, subtitle, items }: WhatsInsideGridProps) {
	return (
		<Section>
			<SectionHeading title={title} description={subtitle} />
			<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{items.map((item) => {
					const Icon = item.icon ? ICONS[item.icon] : undefined
					return (
						<div key={item.title} className="flex gap-4">
							<div className="mt-0.5">
								{Icon && (
									<Icon className="h-5 w-5 shrink-0 text-black dark:text-white" strokeWidth={2} />
								)}
							</div>
							<div className="min-w-0">
								<h3 className="font-semibold text-black dark:text-white">{item.title}</h3>
								<p className="text-body mt-2 text-sm leading-relaxed dark:text-zinc-400">
									{item.description}
								</p>
								<ActionLink href={item.url} className="mt-4">
									Learn more
								</ActionLink>
							</div>
						</div>
					)
				})}
			</div>
		</Section>
	)
}
