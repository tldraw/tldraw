import { FeatureHeroCta } from '@/components/sections/feature-hero-cta'
import { Eyebrow } from '@/components/ui/eyebrow'

interface FeatureHeroProps {
	eyebrow?: string
	title: string
	subtitle: string
	ctaPrimary?: { label: string; url: string; variant?: string }
	ctaSecondary?: { label?: string; labelBold?: string; url: string }
}

export function FeatureHero({
	eyebrow,
	title,
	subtitle,
	ctaPrimary,
	ctaSecondary,
}: FeatureHeroProps) {
	return (
		<section className="pt-20 sm:pt-32">
			<div className="mx-auto max-w-content px-5 sm:px-8">
				{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
				<h1 className="mt-4 text-4xl font-semibold tracking-heading text-black dark:text-white sm:text-5xl lg:text-6xl">
					{title}
				</h1>
				<p className="mt-6 max-w-2xl text-lg leading-8 text-body dark:text-zinc-400">{subtitle}</p>
				{ctaPrimary && <FeatureHeroCta ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} />}
			</div>
		</section>
	)
}
