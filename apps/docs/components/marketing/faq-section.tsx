import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

export function FAQSection() {
	return (
		<Section id="faq">
			<SectionHeading
				subheading="FAQ"
				heading="Frequently Asked Questions"
				description={
					<>
						Have more questions?{' '}
						<Link href="mailto:hello@tldraw.com" className="text-blue-500 hover:text-blue-600">
							Contact us
						</Link>{' '}
						and we’ll respond as quickly as possible.
					</>
				}
			/>
			<div className="px-5 max-w-2xl mx-auto">
				{faq.map(({ q, a }, index) => (
					<Disclosure
						key={index}
						as="div"
						className="w-full py-8 border-b border-zinc-100 first-of-type:pt-0 last-of-type:pb-0 last-of-type:border-b-0"
					>
						<DisclosureButton className="group w-full flex items-start justify-between gap-8 text-black">
							<div className="font-semibold text-left">{q}</div>
							<PlusIcon className="shrink-0 h-5 mt-0.5 group-data-[open]:hidden" />
							<MinusIcon className="shrink-0 h-5 mt-0.5 hidden group-data-[open]:block" />
						</DisclosureButton>
						<DisclosurePanel className="pt-4 pr-8">{a}</DisclosurePanel>
					</Disclosure>
				))}
			</div>
		</Section>
	)
}

const faq = [
	{
		q: 'What sort of projects can I use tldraw for?',
		a: 'Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo. Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo.',
	},
	{
		q: 'Where can I find examples on how to integrate tldraw?',
		a: 'Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo. Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo.',
	},
	{
		q: 'What happens when I unsubscribe from the Premium plan?',
		a: 'Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo. Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo.',
	},
	{
		q: 'Can your team build a custom integration for our organization?',
		a: 'Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo. Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo.',
	},
	{
		q: 'What is included in the private Discord channel?',
		a: 'Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo. Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo.',
	},

	{
		q: 'How do I unsubscribe from the Premium plan?',
		a: 'Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo. Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo.',
	},
	{
		q: 'How do I request a feature for Tldraw?',
		a: 'Lorem ipsum dolor sit amet consectetur. Feugiat porttitor sed in sed quis purus. Sed amet scelerisque aliquam semper faucibus vivamus risus leo.',
	},
]
