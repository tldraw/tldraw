import { SearchButton } from '@/components/search/button'

export const SearchBar = () => {
	return (
		<div className="hidden md:block w-full max-w-3xl mx-auto px-5 lg:px-12 sticky top-4 z-10">
			<SearchButton type="docs" layout="desktop" />
		</div>
	)
}
