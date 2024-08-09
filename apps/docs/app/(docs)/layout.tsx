import { DocsSearchBar } from '@/components/docs/docs-search-bar'

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<DocsSearchBar />
			{children}
		</>
	)
}
