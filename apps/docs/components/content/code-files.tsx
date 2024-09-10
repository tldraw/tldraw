import { cn } from '@/utils/cn'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import hljs from 'highlight.js/lib/common'

export function CodeFiles({
	files,
	hideTabs,
	className,
}: {
	files: { name: string; content: any }[]
	hideCopyButton?: boolean
	hideTabs?: boolean
	className?: string
}) {
	return (
		<TabGroup
			className={cn(
				'group relative not-prose bg-zinc-100 dark:bg-zinc-800 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1 my-6 flex flex-col',
				'[td_&]:m-0 [td_&]:mb-2 [td_&]:p-0 [td_&]:bg-transparent [td_&]:rounded-none',
				className
			)}
		>
			<TabList
				className={cn(
					'bg-zinc-900 shrink-0 text-sm text-zinc-400 shadow md:rounded-t-xl border-b border-zinc-700/50 px-5 md:px-4 gap-4 flex',
					hideTabs && 'hidden'
				)}
			>
				{files.map(({ name }, index) => (
					<Tab
						key={index}
						className="h-8 data-[selected]:text-white border-b border-transparent data-[selected]:border-white -mb-px focus:outline-none"
					>
						{name}
					</Tab>
				))}
			</TabList>
			<TabPanels
				className={cn(
					'bg-zinc-900 grow text-sm text-white shadow md:rounded-b-xl overflow-x-auto px-5 md:px-4 py-4',
					hideTabs && 'md:rounded-t-xl'
				)}
			>
				{files.map(({ content, name }, index) => {
					const language = name.endsWith('.css') ? 'css' : 'ts'
					return (
						<TabPanel key={index}>
							<pre className="max-h-96 overflow-y-auto">
								<code
									className={`hljs language-${language}`}
									dangerouslySetInnerHTML={{
										__html: hljs.highlight(content, { language }).value,
									}}
								/>
							</pre>
						</TabPanel>
					)
				})}
			</TabPanels>
		</TabGroup>
	)
}
