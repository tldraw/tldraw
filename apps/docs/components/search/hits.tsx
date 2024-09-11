import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { Fragment } from 'react'
import { Highlight, useHits } from 'react-instantsearch'

export function Hits() {
	const { items } = useHits()
	const router = useRouter()
	let section = ''

	const onSelect = (path: string) => {
		router.push(path)
	}

	return (
		<Command.List className="max-h-[32rem] overflow-y-auto p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800">
			<Command.Empty className="text-center py-8 text-zinc-400 dark:text-zinc-600">
				Nothing found...
			</Command.Empty>
			{items.map((hit) => {
				const showChapter = hit.section !== section
				section = hit.section
				return (
					<Fragment key={hit.objectID}>
						{showChapter && (
							<div className="text-black dark:text-white font-semibold mt-6 mb-4">{section}</div>
						)}
						<Command.Item
							value={hit.path}
							onSelect={onSelect}
							className="group px-4 pt-2.5 pb-3 bg-zinc-100 dark:bg-zinc-800 mt-2 rounded-md cursor-pointer data-[selected=true]:bg-blue-500 dark:data-[selected=true]:bg-blue-500 data-[selected=true]:text-blue-200 [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:data-[selected=true]:text-white"
						>
							<Highlight
								attribute="title"
								hit={hit}
								className="text-black dark:text-white group-data-[selected=true]:text-white"
							/>
							{hit.description && (
								<Highlight attribute="description" hit={hit} className="line-clamp-1 text-sm" />
							)}
							{hit.joinedHeadings && (
								<Highlight attribute="joinedHeadings" hit={hit} className="line-clamp-1 text-sm" />
							)}
						</Command.Item>
					</Fragment>
				)
			})}
		</Command.List>
	)
}
