import { Footer } from '@/components/navigation/footer'
import { Header } from '@/components/navigation/header'
import { ThemeProvider } from 'next-themes'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
			<Header />
			<main>{children}</main>
			<Footer />
		</ThemeProvider>
	)
}
