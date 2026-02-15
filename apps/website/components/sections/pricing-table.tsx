import { Card } from '@/components/ui/card'
import { CheckIcon } from '@/components/ui/check-icon'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface PricingTier {
	_id: string
	name: string
	price: string
	period?: string
	description: string
	features: string[]
	ctaUrl: string
	ctaLabel: string
	isHighlighted?: boolean
}

interface PricingTableProps {
	tiers: PricingTier[]
}

export function PricingTable({ tiers }: PricingTableProps) {
	return (
		<div className="max-w-content mx-auto grid gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
			{tiers.map((tier) => (
				<Card
					key={tier._id}
					className={cn(
						'relative rounded-2xl p-8',
						tier.isHighlighted && 'border-brand-blue dark:border-brand-blue shadow-lg'
					)}
				>
					{tier.isHighlighted && (
						<div className="bg-brand-blue dark:bg-brand-blue absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium text-white dark:text-white">
							Most popular
						</div>
					)}
					<h3 className="text-lg font-semibold text-black dark:text-white">{tier.name}</h3>
					<div className="mt-4 flex items-baseline">
						<span className="text-4xl font-semibold text-black dark:text-white">{tier.price}</span>
						{tier.period && (
							<span className="ml-1 text-sm text-zinc-500 dark:text-zinc-400">/{tier.period}</span>
						)}
					</div>
					<p className="text-body mt-4 text-sm dark:text-zinc-400">{tier.description}</p>
					<ul className="mt-8 space-y-3">
						{tier.features.map((feature) => (
							<li
								key={feature}
								className="text-body flex items-start gap-3 text-sm dark:text-zinc-400"
							>
								<CheckIcon />
								{feature}
							</li>
						))}
					</ul>
					<Link
						href={tier.ctaUrl}
						className={cn(
							'mt-8 block w-full rounded-md py-3 text-center text-sm font-semibold transition-colors',
							tier.isHighlighted
								? 'bg-brand-blue dark:bg-brand-blue text-white hover:bg-blue-700 dark:text-white dark:hover:bg-blue-700'
								: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
						)}
					>
						{tier.ctaLabel}
					</Link>
				</Card>
			))}
		</div>
	)
}
