import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { ReactNode } from 'react'
import { BlueA } from '../common/blue-a'

function TierItem({ children }: { children: ReactNode }) {
	return (
		<div className="text-black dark:text-white rounded border border-zinc-300 dark:border-zinc-300">
			{children}
		</div>
	)
}

function TierTitle({ children }: { children: ReactNode }) {
	return <h4 className="text-xl/4 font-bold mx-3 my-4">{children}</h4>
}

function TierDescription({ children }: { children: ReactNode }) {
	return <p className="m-3">{children}</p>
}

function TierFeature({ children }: { children: ReactNode }) {
	return <p className="m-3 text-zinc-800 dark:text-zinc-400">{children}</p>
}

function TierLink({ children, href }: { children: ReactNode; href: string }) {
	return (
		<p className="m-3">
			<BlueA href={href}>{children}</BlueA>
		</p>
	)
}

function TierListSeparator() {
	return (
		<>
			<div className="py-3" />
			<hr />
			<div className="py-3" />
		</>
	)
}

export function PricingSection() {
	return (
		<Section id="pricing">
			<SectionHeading
				heading="Pricing & License"
				description="Use the SDK free with our watermark or purchase a license to hide it. Small team? Small price."
			/>
			<div className="flex flex-col max-w-full w-[680px] mx-auto px-5">
				<TierItem>
					<TierTitle>Startup Lite</TierTitle>
					<TierDescription>$6000/year, paid annually.</TierDescription>
					<TierFeature>For companies with 10 or fewer people.</TierFeature>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<TierLink href="/buy/startup-lite">Contact us</TierLink>
				</TierItem>
				<div className="py-3" />
				<TierItem>
					<TierTitle>Startup</TierTitle>
					<TierDescription>$12000/year, paid annually.</TierDescription>
					<TierFeature>For companies with 10 or fewer people.</TierFeature>
					<TierFeature>Up to two hours of support per month.</TierFeature>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<TierLink href="/buy/startup">Contact us</TierLink>
				</TierItem>
				<div className="py-3" />
				<TierItem>
					<TierTitle>Business</TierTitle>
					<TierDescription>For teams of any size.</TierDescription>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<TierFeature>Custom pricing, agreements, support, and more.</TierFeature>
					<TierLink href="/buy/business">Contact us</TierLink>
				</TierItem>
				<TierListSeparator />
				<TierItem>
					<TierTitle>Free</TierTitle>
					<TierFeature>Use the full tldraw SDK for free.</TierFeature>
					<TierFeature>
						Must display our lovely <b>made with tldraw</b> watermark.
					</TierFeature>
					<TierLink href="/quick-start">Get started</TierLink>
				</TierItem>
			</div>
		</Section>
	)
}
