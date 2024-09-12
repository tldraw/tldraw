import { RequestForm } from '@/components/marketing/request-form'
import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { CheckBadgeIcon } from '@heroicons/react/20/solid'

export function PricingSection() {
	return (
		<div className="bg-zinc-50 dark:bg-zinc-900 mt-16 sm:mt-24 md:mt-32 lg:mt-40">
			<Section id="pricing" className="pb-24 md:pb-32 lg:pb-40">
				<SectionHeading
					subheading="Pricing"
					heading="Free (with our logo) or Buy a License"
					description="You can use the tldraw SDK for free in commercial or non-commercial projects so long as the 'Made with tldraw' link is present. If you would like to remove the link, you can purchase a business license."
				/>
				<div className="py-1 md:rounded-2xl md:mx-auto md:px-1 bg-zinc-200 dark:bg-zinc-800 max-w-2xl">
					<div className="relative w-full h-full bg-zinc-900 md:rounded-xl shadow p-5 md:p-8 overflow-hidden text-zinc-300">
						<div className="flex items-center gap-1 mb-4 -mt-1">
							<h3 className="text-white font-black text-xl md:text-2xl">Business License</h3>
							<CheckBadgeIcon className="h-6 shrink-0 text-blue-400" />
						</div>
						<p className="pr-8">
							Interested in purchasing a business license for the tldraw SDK? Please fill out our
							form and we will get back to you with more information.
						</p>
						<RequestForm />
					</div>
				</div>
			</Section>
		</div>
	)
}
