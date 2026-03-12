'use client'

import { APIGroup } from '@/types/content-types'
import { cn } from '@/utils/cn'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronRightIcon } from '@heroicons/react/16/solid'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function DocsSidebarMenu({
	title,
	elements,
	isFirst = false,
	hideTitle = false,
}: {
	isFirst: boolean
	title: string
	elements: {
		type: string
		articleId: string
		title: string
		url: string
		groupId: string | null
	}[]
	hideTitle?: boolean
}) {
	const pathname = usePathname()
	const groups = elements.some((e) => e.groupId) ? Object.values(APIGroup) : null

	return (
		<div className={cn(isFirst ? 'mt-0 md:mt-8' : 'mt-0 md:mt-12')}>
			{!hideTitle && (
				<h4 className="text-black dark:text-white uppercase text-xs w-full font-semibold md:sticky top-0 bg-white dark:bg-zinc-950 z-10 py-2">
					{title}
				</h4>
			)}
			<ul className={cn('flex flex-col gap-2 text-sm break-words', !hideTitle && 'mt-2')}>
				{groups?.map((group, index) => {
					const groupElements = elements.filter((e) => e.groupId === group)
					if (groupElements.length === 0) return null
					return (
						<li key={index}>
							<Disclosure defaultOpen={groupElements.some((e) => e.url === pathname)}>
								<DisclosureButton className="group w-full flex justify-between gap-4">
									<span className="group-data-[open]:text-black dark:group-data-[open]:text-white group-data-[open]:font-semibold">
										{group}
									</span>
									<ChevronRightIcon className="h-3.5 shrink-0 group-data-[open]:rotate-90 text-zinc-400 dark:text-zinc-600 group-data-[open]:text-black dark:group-data-[open]:text-white" />
								</DisclosureButton>
								<DisclosurePanel>
									<ul className="flex flex-col gap-2 ml-1 pl-2 pt-2 border-l border-zinc-100 dark:border-zinc-800">
										{groupElements.map(({ title, url }, index) => (
											<li key={index}>
												<Link
													href={url}
													data-active={pathname === url}
													className={cn(
														'sidebar-link w-full truncate',
														pathname === url
															? 'text-black dark:text-white font-semibold'
															: 'hover:text-zinc-800 dark:hover:text-zinc-200'
													)}
												>
													{title}
												</Link>
											</li>
										))}
									</ul>
								</DisclosurePanel>
							</Disclosure>
						</li>
					)
				}) ??
					elements.map(({ title, url }, index) => (
						<li key={index}>
							<Link
								href={url}
								data-active={pathname === url}
								className={cn(
									'sidebar-link block',
									pathname === url || `/getting-started${pathname}` === url
										? 'text-black dark:text-white font-semibold'
										: 'hover:text-zinc-800 dark:hover:text-zinc-200'
								)}
							>
								{title}
							</Link>
						</li>
					))}
			</ul>
		</div>
	)
}
