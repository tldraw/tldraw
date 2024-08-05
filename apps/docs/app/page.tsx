import { CaseStudiesSection } from '@/components/marketing/case-studies-section'
import { CTASection } from '@/components/marketing/cta-section'
import { DetailsSection } from '@/components/marketing/details-section'
import { FeaturesSection } from '@/components/marketing/features-section'
import { HeroSection } from '@/components/marketing/hero-section'
import { InstallationSection } from '@/components/marketing/installation-section'
import { LogoSection } from '@/components/marketing/logo-section'
import { PricingSection } from '@/components/marketing/pricing-section'

export default function Page() {
	return (
		<>
			<HeroSection />
			<LogoSection />
			<FeaturesSection />
			<DetailsSection />
			<InstallationSection />
			{/* <CustomizationSection /> */}
			<CaseStudiesSection />
			<PricingSection />
			{/* <TestimonialsSection /> */}
			{/* <FAQSection /> */}
			<CTASection />
		</>
	)
}
