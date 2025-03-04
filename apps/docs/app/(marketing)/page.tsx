import { NewsletterSignup } from '@/components/common/newsletter-signup'
import { CTASection } from '@/components/marketing/cta-section'
import { DetailsSection } from '@/components/marketing/details-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { FeaturesSection } from '@/components/marketing/features-section'
import { HeroSection } from '@/components/marketing/hero-section'
import { InstallationSection } from '@/components/marketing/installation-section'
import { LogoSection } from '@/components/marketing/logo-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { TestimonialsSection } from '@/components/marketing/testimonials-section'
import { WatermarkSection } from '@/components/marketing/watermark-section'

export default function Page() {
	return (
		<>
			<HeroSection />
			<LogoSection />
			<PricingSection />
			<InstallationSection />
			<FeaturesSection />
			<DetailsSection />
			{/* <CustomizationSection /> */}
			{/* <CaseStudiesSection /> */}
			<WatermarkSection />
			<PricingSection />
			<TestimonialsSection />
			<FAQSection />
			<CTASection />
			<div className="my-32 lg:my-40">
				<NewsletterSignup bg={false} hideAfterSubmit={false} />
			</div>
		</>
	)
}
