import { cn } from '@/utils/cn'
import { ArrowRightIcon } from '@heroicons/react/16/solid'
import { CodeBracketIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

function Tag({ children }: { children: React.ReactNode; tag: string }) {
	return <span className="border border-zinc-800 rounded-full px-1.5 text-xs">{children}</span>
}

export function ApiMemberTitle({
	children,
	source,
	tags,
	inherited,
	large,
}: {
	children: React.ReactNode
	source?: string | null
	large?: boolean
	tags?: string[]
	inherited?: { name: string; link: string }
}) {
	return (
		<>
			<div className="flex items-end gap-2 prose-headings:mb-0">
				{children}
				<div className={cn('flex gap-2 items-center pb-1.5', !large && 'ml-auto')}>
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
						className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center"
					>
						<span>{inherited.name}</span>
						<ArrowRightIcon className="h-3 -rotate-45" />
					</Link>
				</div>
			)}
		</>
	)
}
