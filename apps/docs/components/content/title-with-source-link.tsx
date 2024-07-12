import { ArrowRightIcon } from '@heroicons/react/16/solid'
import { CodeBracketIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

const Tag: React.FC<{ children: React.ReactNode; tag: string }> = ({ children, tag }) => {
	return <span className="border border-zinc-800 rounded-full px-1.5 text-xs">{children}</span>
}

export const TitleWithSourceLink: React.FC<{
	children: React.ReactNode
	source?: string | null
	large?: boolean
	tags?: string[]
	inherited?: { name: string; link: string }
}> = ({ children, source, large, tags, inherited }) => {
	return (
		<>
			<div className="flex items-end gap-2 prose-headings:mb-0">
				{children}
				<div className="flex gap-2 items-center pb-2">
					{tags?.map((tag) => (
						<Tag key={tag} tag={tag}>
							{tag}
						</Tag>
					))}
					{source && (
						<a href={source} target="_blank" rel="noopener noreferrer" title="Source code">
							<CodeBracketIcon className="size-20" />
						</a>
					)}
				</div>
			</div>
			{inherited && (
				<div className="not-prose text-xs mb-6">
					from{' '}
					<Link
						href={inherited.link}
						className="text-blue-500 hover:text-blue-600 inline-flex items-center"
					>
						<span>{inherited.name}</span>
						<ArrowRightIcon className="h-3 -rotate-45" />
					</Link>
				</div>
			)}
		</>
	)
}