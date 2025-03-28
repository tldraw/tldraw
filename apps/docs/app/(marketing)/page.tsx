import { NewsletterSignup } from '@/components/common/newsletter-signup'
import { CommunitySection } from '@/components/marketing/community-section'
import { DemoSection } from '@/components/marketing/demo-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { HeroCtas } from '@/components/marketing/hero-ctas'
import { HeroTitle } from '@/components/marketing/hero-title'
import { InstallationSection } from '@/components/marketing/installation-section'
import { LogoSection } from '@/components/marketing/logo-section'
import { PricingSection } from '@/components/marketing/pricing-section'

function SectionGap() {
	return <div className="h-[96px] md:h-[184px]" />
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
			<PricingSection />
			<SectionGap />
			<FAQSection />
			<SectionGap />
			<CommunitySection />
			{/* <CTASection /> */}
			<div className="h-[64px] md:h-[64px]" />
			<NewsletterSignup bg={false} hideAfterSubmit={false} />
			<SectionGap />
		</>
	)
}
