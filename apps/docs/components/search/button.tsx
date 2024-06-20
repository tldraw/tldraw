import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'

export const SearchButton: React.FC<{ type: 'docs' | 'blog' }> = ({ type }) => {
	return (
		<>
			<button className="w-full h-10 flex justify-between items-center bg-zinc-50 rounded-lg px-4 text-black cursor-text hover:bg-zinc-100">
				<div className="flex items-center gap-3">
					<MagnifyingGlassIcon className="h-4" />
					<span className="capitalize text-sm text-zinc-400">Search {type}...</span>
				</div>
				<span className="text-xs">⌘K</span>
			</button>
		</>
	)
}
