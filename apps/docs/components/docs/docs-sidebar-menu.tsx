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
}: {
	title: string
	elements: {
		type: string
		articleId: string
		title: string
		url: string
		groupId: string | null
	}[]
}) {
	const pathname = usePathname()
	const groups = elements.some((e) => e.groupId) ? Object.values(APIGroup) : null

	return (
		<div className="mt-8 md:mt-12">
			<h4 className="text-black dark:text-white uppercase text-xs font-semibold">{title}</h4>
			<ul className="flex flex-col mt-2 gap-2 text-sm break-words">
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
														'sidebar-link line-clamp-1',
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
									'sidebar-link',
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
