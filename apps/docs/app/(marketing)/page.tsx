import { CaseStudiesSection } from '@/components/marketing/case-studies-section'
import { CommunitySection } from '@/components/marketing/community-section'
import { CTASection } from '@/components/marketing/cta-section'
import { DemoSection } from '@/components/marketing/demo-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { HeroCtas } from '@/components/marketing/hero-ctas'
import { HeroTitle } from '@/components/marketing/hero-title'
import { InstallationSection } from '@/components/marketing/installation-section'
import { LogoSection } from '@/components/marketing/logo-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { WhatItIsSection } from '@/components/marketing/what-it-is-section'

function SectionGap() {
	return <div className="h-[140px] md:h-[184px]" />
}

export default function Page() {
	return (
		<>
			<div className="h-[64px] md:h-[160px]" />
			<HeroTitle />
			<div className="h-[64px] md:h-[64px]" />
			<HeroCtas />
			<div className="h-[96px] md:h-[96px]" />
			<DemoSection />
			<div className="h-[96px] md:h-[96px]" />
			<LogoSection />
			{/* <CaseStudiesSection /> */}
			{/* <FeaturesSection />
			<DetailsSection /> */}
			{/* <CustomizationSection /> */}
			{/* <WatermarkSection /> */}
			<SectionGap />
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
