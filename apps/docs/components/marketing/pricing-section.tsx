import { Section } from '@/components/marketing/section'
import { BlueA } from '../common/blue-a'
import { SectionSubtitle } from './section-description'
import { SectionProse } from './section-prose'
import { SectionTitle } from './section-title'

export function PricingSection() {
	return (
		<Section id="pricing">
			<SectionTitle>License & Pricing</SectionTitle>
			<SectionSubtitle>
				Build for free with our watermark. Startup pricing available.
			</SectionSubtitle>
			<SectionProse>
				<p>
					<b>Do I need to buy a license?</b>
				</p>
				<p>
					You can evaluate the tldraw SDK under its{' '}
					<BlueA href="/legal/tldraw-license">default license</BlueA>, which requires that the
					&quot;made with tldraw&quot; watermark is present on the canvas at all times. The
					watermark captures anonymous data about where it is used.
				</p>
				<p>
					If you are a business using the tldraw SDK in production, you should purchase a license.
					To use the SDK without the watermark you must purchase a license.
				</p>
				<p>
					<b>How much does a license cost?</b>
				</p>
				<p>
					Individuals and teams of less than ten people can purchase a license for <b>$6,000</b> per
					year. Larger companies or teams that need support from tldraw can design a package with
					custom pricing, support, and contract terms.
				</p>
				<p>
					All customers receive a <BlueA href="/community/license">license key</BlueA> that will
					hide the &quot;made with tldraw&quot; watermark on your domains. See our{' '}
					<BlueA href="#faq">FAQ</BlueA> for more information.
				</p>
				{/* <h3 className="font-bold">Startup</h3>
				<p>
					Individuals and companies of ten people or fewer can purchase our{' '}
					<BlueA href="/buy/startup-lite">startup plan</BlueA> for $6,000 per year.
				</p> */}
			</SectionProse>
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
