import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { ReactNode } from 'react'
import { BlueA } from '../common/blue-a'

function TierItem({ children }: { children: ReactNode }) {
	return <div className="text-black dark:text-white">{children}</div>
}

function TierTitle({ children }: { children: ReactNode }) {
	return <h4 className="text-xl/4 font-bold mb-5">{children}</h4>
}

function TierDescription({ children }: { children: ReactNode }) {
	return <p className="my-3">{children}</p>
}

function TierFeature({ children }: { children: ReactNode }) {
	return <p className="my-3 text-zinc-800 dark:text-zinc-400">{children}</p>
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
			<div className="flex flex-col w-full max-w-lg mx-auto px-5">
				<TierItem>
					<TierTitle>Startup Lite</TierTitle>
					<TierDescription>$6000/year, paid annually.</TierDescription>
					<TierFeature>For companies with 10 or fewer people.</TierFeature>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<p className="my-3">
						<BlueA href="/buy/startup-lite">Contact us</BlueA>
					</p>
				</TierItem>
				<div className="py-3" />
				<TierItem>
					<TierTitle>Startup</TierTitle>
					<TierDescription>$12000/year, paid annually.</TierDescription>
					<TierFeature>For companies with 10 or fewer people.</TierFeature>
					<TierFeature>Up to two hours of support per month.</TierFeature>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<p className="my-3">
						<BlueA href="/buy/startup">Contact us</BlueA>
					</p>
				</TierItem>
				<div className="py-3" />
				<TierItem>
					<TierTitle>Business</TierTitle>
					<TierDescription>For teams of any size.</TierDescription>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<TierFeature>Custom pricing, agreements, support, and more.</TierFeature>
					<p className="my-3">
						<BlueA href="/buy/startup-lite">Contact us</BlueA>
					</p>
				</TierItem>
				<TierListSeparator />
				<TierItem>
					<TierTitle>Free</TierTitle>
					<TierFeature>Use the full tldraw SDK for free.</TierFeature>
					<TierFeature>
						Must display our lovely <b>made with tldraw</b> watermark.
					</TierFeature>
					<p className="my-3">
						<BlueA href="/quick-start">Get started</BlueA>
					</p>
				</TierItem>
			</div>
		</Section>
	)
}
