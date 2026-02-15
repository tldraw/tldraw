import { Section } from '@/components/ui/section'
import Link from 'next/link'

interface CTASectionProps {
	title: string
	description?: string
	cta: { label: string; url: string }
}

export function CTASection({ title, description, cta }: CTASectionProps) {
	return (
		<Section>
			<div className="rounded-2xl bg-zinc-900 px-8 py-16 text-center sm:px-16 dark:bg-zinc-800">
				<h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
				{description && <p className="mt-4 text-lg text-zinc-300">{description}</p>}
				<div className="mt-8">
					<Link
						href={cta.url}
						className="inline-flex rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-xs transition-colors hover:bg-zinc-100"
					>
						{cta.label}
					</Link>
				</div>
			</div>
		</Section>
	)
}
