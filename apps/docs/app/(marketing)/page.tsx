import { CaseStudiesSection } from '@/components/marketing/case-studies-section'
import { CommunitySection } from '@/components/marketing/community-section'
import { CTASection } from '@/components/marketing/cta-section'
import { DemoSection } from '@/components/marketing/demo-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { HeroSection } from '@/components/marketing/hero-section'
import { InstallationSection } from '@/components/marketing/installation-section'
import { PricingSection } from '@/components/marketing/pricing-section'
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
			<SectionGap />
			<FAQSection />
			<SectionGap />
			<CTASection />
			<SectionGap />
		</>
	)
}
