import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { CheckCircleIcon, UserCircleIcon } from '@heroicons/react/20/solid'

import { PricingButton } from './pricing-button'

export function PricingSection() {
	return (
		<Section id="pricing">
			<SectionHeading
				subheading="Pricing"
				heading="Purchase a License"
				description="Remove the watermark and access additional support."
			/>
			<div className="mt-20 flow-root">
				<div className="isolate mx-auto md:px-5 -mt-16 grid max-w-sm grid-cols-1 gap-y-16 divide-y divide-gray-100 sm:mx-auto lg:-mx-8 lg:mt-0 lg:max-w-none lg:grid-cols-3 lg:divide-x lg:divide-y-0 xl:-mx-4">
					{tiers.map((tier) => (
						<div key={tier.id} className="pt-16 lg:px-8 lg:pt-0 xl:px-14">
							<h3 id={tier.id} className="text-base/7 font-semibold text-gray-900">
								{tier.name}
							</h3>
							{tier.id === 'business' ? (
								<>
									<p className="mt-6 flex items-baseline gap-x-1">
										<span className="text-5xl font-semibold tracking-tight text-gray-900">
											Custom
										</span>
									</p>
									<p className="mt-3 text-sm/6 text-gray-500">Value based pricing available</p>
								</>
							) : (
								<>
									<p className="mt-6 flex items-baseline gap-x-1">
										<span className="text-5xl font-semibold tracking-tight text-gray-900">
											{tier.price.monthly}
										</span>
										<span className="text-sm/6 font-semibold text-gray-600">/month</span>
									</p>
									<p className="mt-3 text-sm/6 text-gray-500">
										{tier.price.annually} per month if paid annually
									</p>
								</>
							)}
							<PricingButton tier={tier} />
							<p className="mt-10 text-sm/6 font-semibold text-gray-900">{tier.description}</p>
							<ul role="list" className="mt-6 space-y-3 text-sm/6 text-gray-600">
								{tier.features.map((feature, i) => (
									<li key={feature} className="flex gap-x-3">
										{tier.flagFirst && i === 0 ? (
											<UserCircleIcon aria-hidden="true" className="h-6 w-5 flex-none" />
										) : (
											<CheckCircleIcon
												aria-hidden="true"
												className="h-6 w-5 flex-none text-black-500"
											/>
										)}
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
		price: {
			monthly: '$499',
			annually: '$449',
		},
		href: '/buy/startup-lite',
		description: 'For small teams getting started.',
		features: ['Fewer than 10 employees', 'No watermark', 'Community support'],
		flagFirst: true,
	},
	{
		id: 'startup',
		name: 'Startup',
		price: {
			monthly: '$999',
			annually: '$899',
		},
		href: '/buy/startup',
		description: 'For small teams who need to speak to us.',
		features: ['Fewer than 10 employees', 'No watermark', 'Priority support'],
		flagFirst: true,
	},
	{
		id: 'business',
		name: 'Business',
		href: '/buy/business',
		description: 'For larger teams and enterprises.',
		features: [
			'No watermark',
			'Priority support',
			'Custom agreements',
			'Dedicated account manager',
		],
		flagFirst: false,
	},
] as const
