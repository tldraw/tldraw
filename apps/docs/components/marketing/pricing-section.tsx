import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { BlueA } from '../common/blue-a'

export function PricingSection() {
	return (
		<Section id="pricing">
			<SectionHeading
				heading="License & Pricing"
				description="Get started for free with our watermark. Purchase a license to hide it. Small team? Small price."
			/>
			<div className="flex flex-col max-w-full w-[680px] mx-auto px-5 text-black dark:text-white gap-5">
				<p>
					<b>You can use tldraw SDK for free</b>, including in commercial applications, so long as
					the &quot;made with tldraw&quot; watermark is present on the canvas.
				</p>
				<p>To use the tldraw SDK without the watermark, you will need to purchase a license.</p>
				<ul className="flex flex-col gap-5 list-disc pl-4">
					<li>
						<b>Individuals and companies of ten people or fewer</b> can purchase our{' '}
						<BlueA href="/buy/startup-lite">Startup plan</BlueA> for a flat $6,000 per year.
					</li>
					<li>
						<b>Companies with more than ten people</b> can purchase a{' '}
						<BlueA href="/buy/business">Business</BlueA> plan. This plan&quot;s features and its
						pricing can be adjusted to fit your needs.
					</li>
				</ul>
				<p>
					Both plans include a license key that will hide the watermark on your domain. See the{' '}
					<BlueA href="#pricing">FAQ section</BlueA> for more on the SDK&apos;s license and pricing.
				</p>
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
