import { CaseStudiesSection } from '@/components/marketing/case-studies-section'
import { CommunitySection } from '@/components/marketing/community-section'
import { CTASection } from '@/components/marketing/cta-section'
import { DemoSection } from '@/components/marketing/demo-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { HeroSection } from '@/components/marketing/hero-section'
import { InstallationSection } from '@/components/marketing/installation-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { RequestForm } from '@/components/marketing/request-form'
import { WhatItIsSection } from '@/components/marketing/what-it-is-section'

function SectionGap() {
	return <div className="h-[140px] md:h-[184px]" />
}

export default function Page() {
	return (
		<>
			<div className="h-[64px] md:h-[160px]" />
			<HeroSection />
			<div className="h-[96px] md:h-[96px]" />
			<DemoSection />
			<SectionGap />
			{/* <CaseStudiesSection /> */}
			{/* <FeaturesSection />
			<DetailsSection /> */}
			{/* <CustomizationSection /> */}
			{/* <WatermarkSection /> */}
			<InstallationSection />
			<SectionGap />
			<CaseStudiesSection />
			<SectionGap />
			<WhatItIsSection />
			<SectionGap />
			<CommunitySection />
			<SectionGap />
			<PricingSection />
			<div className="h-12" />
			<div className="py-1 md:rounded-2xl md:mx-auto md:px-1 bg-zinc-200 dark:bg-zinc-800 w-full max-w-2xl">
				<div className="relative w-full h-full bg-zinc-900 md:rounded-xl shadow p-5 md:p-8 overflow-hidden text-zinc-300">
					<div className="flex items-center gap-1 mb-4 -mt-1">
						<h3 className="text-white font-black text-xl md:text-2xl">Request a license</h3>
						{/* <CheckBadgeIcon className="h-6 shrink-0 text-blue-400" /> */}
					</div>
					<RequestForm form="general" />
				</div>
			</div>
			<SectionGap />
			<FAQSection />
			<SectionGap />
			<CTASection />
			<SectionGap />
		</>
	)
}
