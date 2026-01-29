'use client'

import { track } from '@/app/analytics'
import { Icon } from '@/components/common/icon'
import { cn } from '@/utils/cn'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import Link from 'next/link'

const AI_PROVIDERS = [
	{
		name: 'Claude',
		icon: 'claude' as const,
		getUrl: (pageUrl: string) =>
			`https://claude.ai/new?q=${encodeURIComponent(`Read ${pageUrl}, I want to ask questions about it.`)}`,
	},
	{
		name: 'ChatGPT',
		icon: 'chatgpt' as const,
		getUrl: (pageUrl: string) =>
			`https://chatgpt.com/?hints=search&prompt=${encodeURIComponent(`Read ${pageUrl}, I want to ask questions about it.`)}`,
	},
]

export function OpenWithAiDropdown({ pageUrl }: { pageUrl: string }) {
	return (
		<Popover className="relative group/ai-dropdown">
			<PopoverButton
				className={cn(
					'relative overflow-hidden flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-zinc-900 focus:ring-offset-zinc-50',
					'h-7 px-3 gap-2 rounded-md text-sm',
					'bg-zinc-100 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700',
					'cursor-pointer'
				)}
			>
				<Icon icon="sparkles" className="h-3.5" />
				<span className="whitespace-nowrap">Open with AI</span>
				<ChevronDownIcon className="h-3.5 transition-transform duration-150 group-data-[open]/ai-dropdown:rotate-180" />
			</PopoverButton>
			<PopoverPanel
				anchor="bottom end"
				className="z-50 mt-1 w-40 rounded-lg bg-white dark:bg-zinc-800 shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-700 p-1"
			>
				{AI_PROVIDERS.map((provider) => (
					<Link
						key={provider.name}
						href={provider.getUrl(pageUrl)}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() => track('open-with-ai', { provider: provider.name })}
						className={cn(
							'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md',
							'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700'
						)}
					>
						<Icon icon={provider.icon} className="h-4 w-4" />
						<span>{provider.name}</span>
					</Link>
				))}
			</PopoverPanel>
		</Popover>
	)
}
