import { SearchButton } from '@/components/search/SearchButton'

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<SearchButton layout="keyboard-shortcut-only" type="docs" />
			{children}
		</>
	)
}
