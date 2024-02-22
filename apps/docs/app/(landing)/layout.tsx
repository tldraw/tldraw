import { Footer } from '@/components/Footer'

export default async function LandingPageLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="wrapper">
			{children}
			<Footer />
		</div>
	)
}
