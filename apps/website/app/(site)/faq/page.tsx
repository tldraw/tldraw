import { CommunitySection } from '@/components/sections/community-section'
import { FAQAccordionGrouped } from '@/components/sections/faq-accordion'
import { FinalCtaSection } from '@/components/sections/final-cta-section'
import { db } from '@/utils/ContentDatabase'
import { getFaqSections } from '@/utils/collections'
import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'FAQ',
	description: 'Frequently asked questions about tldraw and the tldraw SDK.',
}

export default async function FAQPage() {
	const [faqSections, homePage] = await Promise.all([getFaqSections(), db.getPage('/')])

	const homeMeta = homePage?.metadata ? JSON.parse(homePage.metadata) : {}

	const sections = faqSections.map((section) => ({
		heading: section.heading,
		description: section.description,
		items: section.items.map((item) => ({
			question: item.data.question,
			answer: item.data.answer,
		})),
	}))

	return (
		<>
			<div className="max-w-content mx-auto border-b border-zinc-200 px-4 pt-10 pb-8 sm:px-8 lg:pt-20 lg:pb-14 dark:border-zinc-800">
				<h1 className="text-3xl font-semibold text-black lg:text-5xl dark:text-white">FAQ</h1>
				<p className="text-body mt-4 text-sm leading-relaxed lg:mt-6 dark:text-zinc-400">
					Frequently asked questions about the tldraw SDK product, pricing, and more.
					<br />
					Need more help? Learn more and connect here:
				</p>
				<div className="mt-4 flex items-center gap-5">
					<a
						href="https://tldraw.dev/docs"
						className="text-brand-link inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
					>
						<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z" />
						</svg>
						Docs
					</a>
					<a
						href="https://github.com/tldraw/tldraw"
						className="text-brand-link inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
					>
						<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
						</svg>
						GitHub
					</a>
					<a
						href="https://discord.com/invite/SBBEVCA4PG"
						className="text-brand-link inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
					>
						<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
							<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
						</svg>
						Discord
					</a>
				</div>
			</div>
			<div className="max-w-content mx-auto px-4 sm:px-8">
				<FAQAccordionGrouped sections={sections} />
			</div>
			<CommunitySection />
			{homeMeta.finalCta && (
				<FinalCtaSection
					title={homeMeta.finalCta.title}
					description={homeMeta.finalCta.description}
					descriptionBold={homeMeta.finalCta.descriptionBold}
					ctaPrimary={homeMeta.finalCta.ctaPrimary}
					ctaSecondary={homeMeta.finalCta.ctaSecondary}
				/>
			)}
		</>
	)
}
