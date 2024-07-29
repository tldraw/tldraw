'use client'

import { Button } from '@/components/common/button'
import { cn } from '@/utils/cn'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import hljs from 'highlight.js/lib/common'
import { useRef, useState } from 'react'

export const Code: React.FC<{
	files: { name: string; content: any }[]
	hideCopyButton?: boolean
	className?: string
}> = ({ files, hideCopyButton, className }) => {
	const container = useRef<HTMLPreElement>(null)
	const [copied, setCopied] = useState<boolean>(false)

	const copy = () => {
		const code: string = container.current?.innerText ?? ''
		navigator.clipboard.writeText(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	return (
		<TabGroup
			className={cn(
				'group relative not-prose bg-zinc-100 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1 my-6 flex flex-col',
				'[td_&]:m-0 [td_&]:mb-2 [td_&]:p-0 [td_&]:bg-transparent [td_&]:rounded-none',
				className
			)}
		>
			<TabList className="bg-zinc-900 shrink-0 text-sm text-zinc-400 shadow md:rounded-t-xl border-b border-zinc-700/50 px-5 md:px-4 gap-4 flex">
				{files.map(({ name }, index) => (
					<Tab
						key={index}
						className="h-8 data-[selected]:text-white border-b border-transparent data-[selected]:border-white -mb-px focus:outline-none"
					>
						{name}
					</Tab>
				))}
			</TabList>
			<TabPanels className="bg-zinc-900 grow text-sm text-white shadow md:rounded-b-xl overflow-x-auto px-5 md:px-4 py-4">
				{files.map(({ content }, index) => (
					<TabPanel key={index}>
						<pre className="max-h-96 overflow-y-auto">
							<code
								ref={container}
								className="hljs language-ts"
								dangerouslySetInnerHTML={{
									__html: hljs.highlight(content, { language: 'ts' }).value,
								}}
							/>
						</pre>
					</TabPanel>
				))}
			</TabPanels>
			{!hideCopyButton && (
				<Button
					onClick={copy}
					caption={copied ? 'Copied' : 'Copy'}
					icon={copied ? 'check' : 'paperclip'}
					size="xs"
					className="absolute -top-2 right-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-100"
				/>
			)}
		</TabGroup>
	)
}
