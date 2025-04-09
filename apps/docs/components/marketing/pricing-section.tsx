import { Section } from '@/components/marketing/section'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import { BlueA } from '../common/blue-a'
import { RequestForm } from './request-form'
import { SectionSubtitle } from './section-description'
import { SectionProse } from './section-prose'
import { SectionTitle } from './section-title'

export function PricingSection() {
	return (
		<Section id="pricing">
			<SectionTitle>License & Pricing</SectionTitle>
			<SectionSubtitle>
				Get started for free with our watermark. Purchase a license to hide it. Small team? Small
				price.
			</SectionSubtitle>
			<SectionProse>
				<h3 className="font-bold">Free</h3>
				<p>
					You can use the tldraw SDK for free, including in commercial applications, so long as the
					&quot;made with tldraw&quot; watermark is present on the canvas. The watermark captures
					anonymous data about where it is used. For more information, see our{' '}
					<BlueA href="/legal/tldraw-license">default license</BlueA>.
				</p>
				<hr className="my-2" />
				<p>
					To use the tldraw SDK without the watermark, you can purchase a license. You will receive
					a{' '}
					<BlueA href="https://tldraw.notion.site/License-keys-in-tldraw-e5e8566857f64a709ef23ab30336e66c">
						license key
					</BlueA>{' '}
					that will hide the watermark on your domains.
				</p>
				<h3 className="font-bold">Startup</h3>
				<p>
					Individuals and companies of ten people or fewer can purchase our{' '}
					<BlueA href="/buy/startup-lite">startup plan</BlueA> for $6,000 per year.
				</p>
				<h3 className="font-bold">Business</h3>
				<p>
					Companies with more than ten people can purchase a{' '}
					<BlueA href="/buy/business">business</BlueA> plan. This plan&apos;s features and its
					pricing can be adjusted to fit your needs.
				</p>
			</SectionProse>
			<div className="mt-16 py-1 md:rounded-2xl md:mx-auto md:px-1 bg-zinc-200 dark:bg-zinc-800 w-full max-w-2xl">
				<div className="relative w-full h-full bg-zinc-900 md:rounded-xl shadow p-5 md:p-8 overflow-hidden text-zinc-300">
					<div className="flex items-center gap-1 mb-4 -mt-1">
						<h3 className="text-white font-black text-xl md:text-2xl">Get in touch</h3>
						<CheckBadgeIcon className="h-6 shrink-0 text-blue-400" />
					</div>
					<p className="pr-8">
						Interested in purchasing a license for the tldraw SDK? Please fill out our form.
					</p>
					<RequestForm form="general" />
				</div>
			</div>
		</Section>
	)
}

// function TierItem({ children }: { children: ReactNode }) {
// 	return (
// 		<div
// 			className={cn(
// 				'text-black dark:text-white',
// 				'p-2 border border-zinc-300 dark:border-zinc-800 rounded-md'
// 			)}
// 		>
// 			{children}
// 		</div>
// 	)
// }

// function TierTitle({ children }: { children: ReactNode }) {
// 	return <h4 className="text-xl/4 font-bold mx-3 my-4">{children}</h4>
// }

// function TierDescription({ children }: { children: ReactNode }) {
// 	return <p className="m-3">{children}</p>
// }

// function TierFeature({ children }: { children: ReactNode }) {
// 	return <p className="m-3 text-zinc-800 dark:text-zinc-400">{children}</p>
// }

// function TierLink({ children, href }: { children: ReactNode; href: string }) {
// 	return (
// 		<p className="m-3">
// 			<TierLinkInline href={href}>{children}</TierLinkInline>
// 			{/* <a
// 				href={href}
// 				className="border rounded-md px-3 py-2 w-full border-blue-500 hover:border-blue-600 text-blue-500 hover:text-blue-600"
// 			>
// 				{children}
// 				<ArrowRightIcon className="ml-2 inline h-[16px]" />
// 			</a> */}
// 		</p>
// 	)
// }

// function TierLinkInline({ children, href }: { children: ReactNode; href: string }) {
// 	return (
// 		<a href={href} className="text-blue-500 hover:text-blue-600">
// 			{children}
// 		</a>
// 	)
// }

// function TierListSeparator() {
// 	return (
// 		<>
// 			<div className="py-3" />
// 			<hr />
// 			<div className="py-3" />
// 		</>
// 	)
// }

// function BoxedTiers() {
// 	return (
// 		<>
// 			<TierItem>
// 				<TierTitle>Startup Lite</TierTitle>
// 				<TierDescription>$6000 for one year license.</TierDescription>
// 				<TierFeature>For companies with less than 10 people.</TierFeature>
// 				<TierFeature>Includes a license key to remove our watermark.</TierFeature>
// 				<TierLink href="/buy/startup-lite">Contact us</TierLink>
// 			</TierItem>
// 			<div className="py-3" />
// 			<TierItem>
// 				<TierTitle>Startup</TierTitle>
// 				<TierDescription>$12000 for one year license.</TierDescription>
// 				<TierFeature>For companies with less than 10 people.</TierFeature>
// 				<TierFeature>Includes a license key to remove our watermark.</TierFeature>
// 				<TierFeature>Up to two hours of support per month.</TierFeature>
// 				<TierLink href="/buy/startup">Contact us</TierLink>
// 			</TierItem>
// 			<div className="py-3" />
// 			<TierItem>
// 				<TierTitle>Business</TierTitle>
// 				<TierDescription>For companies of any size.</TierDescription>
// 				<TierFeature>Custom pricing, agreements, support, and more.</TierFeature>
// 				<TierFeature>Includes a license key to remove our watermark.</TierFeature>
// 				<TierLink href="/buy/business">Contact us</TierLink>
// 			</TierItem>
// 			<TierListSeparator />
// 			<TierItem>
// 				<TierTitle>Free</TierTitle>
// 				<TierFeature>Use the full tldraw SDK for free.</TierFeature>
// 				<TierFeature>
// 					Must display our lovely <b>made with tldraw</b> watermark.
// 				</TierFeature>
// 				<TierLink href="/quick-start">Get started</TierLink>
// 			</TierItem>
// 		</>
// 	)
// }
