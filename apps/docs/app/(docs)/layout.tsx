import { SearchBar } from '@/components/search/bar'

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<SearchBar />
			{children}
		</>
	)
}
