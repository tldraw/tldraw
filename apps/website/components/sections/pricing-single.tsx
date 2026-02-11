import { ActionLink } from '@/components/ui/action-link'
import { Card } from '@/components/ui/card'
import { CheckIcon } from '@/components/ui/check-icon'
import { ChevronDown, ChevronRight } from '@/components/ui/chevron-icon'
import Link from 'next/link'

interface PricingSingleProps {
	title: string
	description: string
	features: string[]
	ctaPrimary: { label: string; url: string; note?: string }
	ctaSecondary: { label: string; url: string }
	premiumNote?: { text: string; linkLabel: string; linkUrl: string }
	startup: { title: string; description: string; ctaLabel: string; ctaUrl: string }
	hobby: { description: string; ctaLabel: string; ctaUrl: string }
}

export function PricingSingle({
	title,
	description,
	features,
	ctaPrimary,
	ctaSecondary,
	premiumNote,
	startup,
	hobby,
}: PricingSingleProps) {
	return (
		<div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
			{/* Main pricing card */}
			<div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
				<div className="flex">
					<div className="flex-1 p-8 sm:p-10">
						<h2 className="text-2xl font-bold text-black dark:text-white">{title}</h2>
						<p className="text-body mt-3 text-sm dark:text-zinc-400">{description}</p>
						<ul className="mt-8 grid gap-4 min-[1200px]:grid-cols-2 sm:gap-3">
							{features.map((feature) => (
								<li
									key={feature}
									className="text-body flex items-start gap-3 text-sm dark:text-zinc-400"
								>
									<CheckIcon />
									{feature}
								</li>
							))}
						</ul>
						<div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-start">
							<div>
								<Link
									href={ctaPrimary.url}
									className="bg-brand-blue inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 lg:w-auto"
								>
									{ctaPrimary.label}
									<ChevronRight />
								</Link>
								{ctaPrimary.note && (
									<p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{ctaPrimary.note}</p>
								)}
							</div>
							<Link
								href={ctaSecondary.url}
								className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 lg:w-auto dark:bg-white dark:text-black dark:hover:bg-zinc-200"
							>
								{ctaSecondary.label}
								<ChevronRight />
							</Link>
						</div>
					</div>
					{/* Decorative toolbar image */}
					<div className="relative hidden w-[35%] lg:block">
						<img
							src="/images/pricing-toolbar.png"
							alt=""
							className="absolute inset-0 h-full w-full object-contain object-bottom-right"
						/>
					</div>
				</div>
			</div>

			{/* Premium modules note */}
			{premiumNote && (
				<div className="mt-6 flex flex-col gap-1 border-y border-zinc-200 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800">
					<p className="text-body text-sm dark:text-zinc-400">{premiumNote.text}</p>
					<Link
						href={premiumNote.linkUrl}
						className="text-brand-link hover:text-brand-link/90 dark:hover:text-brand-link/90 inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap"
					>
						{premiumNote.linkLabel} <ChevronDown />
					</Link>
				</div>
			)}

			{/* Auxiliary cards */}
			<div className="mt-8 grid gap-6 lg:grid-cols-2">
				{/* Startup pricing */}
				<Card>
					<h3 className="text-lg font-bold text-black dark:text-white">{startup.title}</h3>
					<p className="text-body mt-2 text-sm dark:text-zinc-400">{startup.description}</p>
					<ActionLink href={startup.ctaUrl} className="mt-4">
						{startup.ctaLabel}
					</ActionLink>
				</Card>

				{/* Hobby license */}
				<Card>
					<p className="text-body text-sm dark:text-zinc-400">{hobby.description}</p>
					<ActionLink href={hobby.ctaUrl} className="mt-4">
						{hobby.ctaLabel}
					</ActionLink>
				</Card>
			</div>
		</div>
	)
}
