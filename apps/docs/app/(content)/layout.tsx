import { Footer } from '@/components/Footer'

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="wrapper">
			<div className="layout">{children}</div>
			<Footer />
		</div>
	)
}
