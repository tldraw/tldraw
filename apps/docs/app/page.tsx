import { CustomizationSection } from '@/components/marketing/customization-section'
import { DetailsSection } from '@/components/marketing/details-section'
import { FeaturesSection } from '@/components/marketing/features-section'
import { HeroSection } from '@/components/marketing/hero-section'
import { InstallationSection } from '@/components/marketing/installation-section'
import { LogoSection } from '@/components/marketing/logo-section'

export default function Page() {
	return (
		<div className="pb-96">
			<HeroSection />
			<LogoSection />
			<FeaturesSection />
			<DetailsSection />
			<InstallationSection />
			<CustomizationSection />
		</div>
	)
}