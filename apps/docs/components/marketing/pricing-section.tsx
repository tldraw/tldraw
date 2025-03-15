import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { CheckCircleIcon, UsersIcon } from '@heroicons/react/20/solid'

import { PricingButton } from './pricing-button'

export function PricingSection() {
	return (
		<Section id="pricing">
			<SectionHeading
				heading="Pricing"
				description="Use the SDK free with our watermark or purchase a license."
			/>
			<div className="mt-20 flow-root">
				<div className="isolate mx-auto px-8 md:px-5 -mt-16 grid max-w-sm grid-cols-1 gap-y-16 divide-y divide-gray-100 sm:mx-auto lg:-mx-8 lg:mt-0 lg:max-w-none lg:grid-cols-3 lg:divide-x lg:divide-y-0 xl:-mx-4">
					{tiers.map((tier) => (
						<div key={tier.id} className="pt-16 lg:px-8 lg:pt-0 xl:px-14">
							<h3 id={tier.id} className="text-lg/5 font-semibold text-black dark:text-white">
								{tier.name}
							</h3>
							{tier.id === 'business' ? (
								<>
									<p className="mt-6 flex items-baseline gap-x-1">
										<span className="text-5xl font-semibold tracking-tight text-black dark:text-white">
											Custom
										</span>
									</p>
									<p className="mt-3 text-sm/6 opacity-[.9]">Value based pricing available</p>
								</>
							) : (
								<>
									<p className="mt-6 flex items-baseline gap-x-1">
										<span className="text-5xl font-semibold tracking-tight text-black dark:text-white">
											{tier.price.monthly}
										</span>
										<span className="text-sm/6 font-semibold">/month</span>
									</p>
									<p className="mt-3 text-sm/6 opacity-[.9]">Annual agreement</p>
								</>
							)}
							<PricingButton tier={tier} />
							<p className="mt-10 text-sm/6 font-semibold text-black dark:text-white">
								{tier.description}
							</p>
							<ul role="list" className="mt-6 space-y-3 text-sm/6">
								<li className="flex gap-x-3">
									<UsersIcon className="h-6 w-5 flex-none text-black-500" /> {tier.teamSize}
								</li>
								<hr />
								{tier.features.map((feature) => (
									<li key={feature} className="flex gap-x-3">
										<CheckCircleIcon
											aria-hidden="true"
											className="h-6 w-5 flex-none text-black-500"
										/>
										{feature}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</Section>
	)
}

const tiers = [
	{
		id: 'lite',
		name: 'Startup Lite',
		type: 'secondary',
		price: {
			monthly: '$500',
			annually: '$6,000',
		},
		href: '/buy/startup-lite',
		description: 'For small teams getting started.',
		teamSize: 'Up to 10 employees',
		features: ['No watermark'],
	},
	{
		id: 'startup',
		name: 'Startup',
		type: 'secondary',
		price: {
			monthly: '$1,000',
			annually: '$12,000',
		},
		href: '/buy/startup',
		teamSize: 'Up to 10 employees',
		description: 'For small teams who need to speak to us.',
		features: ['No watermark', 'Up to two hours of support per month'],
	},
	{
		id: 'business',
		name: 'Business',
		type: 'primary',
		href: '/buy/business',
		teamSize: 'No limit on team size',
		description: 'For larger teams and enterprises.',
		features: ['No watermark', 'Premium support', 'Custom agreements', 'Dedicated account manager'],
	},
] as const
