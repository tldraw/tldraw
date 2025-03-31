import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { cn } from '@/utils/cn'
import { ReactNode } from 'react'

function TierItem({ children }: { children: ReactNode }) {
	return (
		<div
			className={cn(
				'text-black dark:text-white',
				'p-2 border border-zinc-300 dark:border-zinc-800 rounded-md'
			)}
		>
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
			<a href={href} className="text-blue-500 hover:text-blue-600">
				{children}
			</a>
			{/* <a
				href={href}
				className="border rounded-md px-3 py-2 w-full border-blue-500 hover:border-blue-600 text-blue-500 hover:text-blue-600"
			>
				{children}
				<ArrowRightIcon className="ml-2 inline h-[16px]" />
			</a> */}
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
					<TierDescription>$6000 for one year license.</TierDescription>
					<TierFeature>For companies with less than 10 people.</TierFeature>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<TierLink href="/buy/startup-lite">Contact us</TierLink>
				</TierItem>
				<div className="py-3" />
				<TierItem>
					<TierTitle>Startup</TierTitle>
					<TierDescription>$12000 for one year license.</TierDescription>
					<TierFeature>For companies with less than 10 people.</TierFeature>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
					<TierFeature>Up to two hours of support per month.</TierFeature>
					<TierLink href="/buy/startup">Contact us</TierLink>
				</TierItem>
				<div className="py-3" />
				<TierItem>
					<TierTitle>Business</TierTitle>
					<TierDescription>For companies of any size.</TierDescription>
					<TierFeature>Custom pricing, agreements, support, and more.</TierFeature>
					<TierFeature>Includes a license key to remove our watermark.</TierFeature>
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
