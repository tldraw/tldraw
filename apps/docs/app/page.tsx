import { FeaturesSection } from '@/components/marketing/features-section'
import { HeroSection } from '@/components/marketing/hero-section'
import { LogoSection } from '@/components/marketing/logo-section'

export default function Page() {
	return (
		<div className="pb-96">
			<HeroSection />
			<LogoSection />
			<FeaturesSection />
		</div>
	)
}
