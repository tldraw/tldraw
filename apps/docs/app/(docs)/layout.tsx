import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { SearchBar } from '@/components/search/bar'

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			<SearchBar />
			{children}
			<Footer />
		</>
	)
}
