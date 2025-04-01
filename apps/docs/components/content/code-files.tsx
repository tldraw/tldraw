'use client'
import { cn } from '@/utils/cn'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/20/solid'
import { ClipboardIcon } from '@heroicons/react/24/outline'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import { useCallback, useState } from 'react'
import { createHighlighterCoreSync, hastToHtml } from 'shiki/core'
import css from 'shiki/dist/langs/css.mjs'
import ts from 'shiki/dist/langs/typescript.mjs'
import theme from 'shiki/dist/themes/github-dark.mjs'

// The normal shiki import is async, which we can't use here easily because of SSR complications.
// So here we create a synchronous version of the highlighter.
const shiki = createHighlighterCoreSync({
	themes: [theme],
	langs: [ts, css],
	engine: createJavaScriptRegexEngine(),
})

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
	const [copied, setCopied] = useState(false)
	const [currentTab, setCurrentTab] = useState(0)

	const handleCopy = useCallback(async () => {
		const text = files[currentTab].content
		await navigator.clipboard.writeText(text)
		setCopied(true)
		const timeout = setTimeout(() => setCopied(false), 1000)
		return () => {
			setCopied(false)
			clearTimeout(timeout)
		}
	}, [currentTab, files])

	const Icon = copied ? CheckIcon : ClipboardIcon

	return (
		<TabGroup
			onChange={setCurrentTab}
			className={cn(
				'max-h-[550px] group relative not-prose bg-zinc-100 dark:bg-zinc-800 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1 my-6 flex flex-col',
				'[td_&]:m-0 [td_&]:mb-2 [td_&]:p-0 [td_&]:bg-transparent [td_&]:rounded-none',
				className
			)}
		>
			<TabList className="flex gap-4 justify-between bg-zinc-900 shrink-0 text-sm text-zinc-400 shadow md:rounded-t-xl border-b border-zinc-700/50 px-5 md:px-4 w-full">
				<div className={cn('flex gap-4', hideTabs && 'hidden')}>
					{files.map(({ name }, index) => (
						<Tab
							key={index}
							className="h-10 data-[selected]:text-white border-b border-transparent data-[selected]:border-white -mb-px focus:outline-none"
						>
							{name}
						</Tab>
					))}
				</div>
				<button
					className="hidden w-8 mx-[-8px] hover:text-zinc-100 md:flex items-center justify-center"
					onClick={handleCopy}
				>
					<div className={cn('transition-opacity duration-300')}>
						<Icon className="size-[1.15rem]" />
					</div>
				</button>
			</TabList>
			<TabPanels
				className={cn(
					'bg-zinc-900 grow text-sm text-white shadow md:rounded-b-xl overflow-x-auto px-5 md:px-4 py-0',
					hideTabs && 'md:rounded-t-xl'
				)}
			>
				{files.map(({ content, name }, index) => {
					const lang = name.endsWith('.css') ? 'css' : 'ts'
					const ast = shiki.codeToHast(content, { lang, theme })
					const codeElem = (ast.children[0] as any).children[0]
					return (
						<TabPanel key={index}>
							<pre
								className="overflow-y-auto p-4"
								dangerouslySetInnerHTML={{
									__html: hastToHtml(codeElem),
								}}
							></pre>
						</TabPanel>
					)
				})}
			</TabPanels>
		</TabGroup>
	)
}
