'use client'

import { cn } from '@/utils/cn'
import {
	CloseButton,
	Popover,
	PopoverBackdrop,
	PopoverButton,
	PopoverPanel,
} from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { motion } from 'framer-motion'
import Link from 'next/link'

export function NavigationLink({
	caption,
	icon,
	href,
	children,
	active,
	closeOnClick = true,
}: {
	caption: string
	icon?: any
	href?: string
	children?: { caption: string; href: string }[]
	active: boolean
	closeOnClick?: boolean
}) {
	const Icon = icon

	if (children)
		return (
			<Popover className="relative group/dropdown">
				<PopoverButton
					className={cn(
						'cursor-pointer flex items-center gap-1 focus:outline-none',
						active
							? 'font-semibold text-black dark:text-white'
							: 'hover:text-zinc-600 dark:hover:text-zinc-100'
					)}
				>
					<span>{caption}</span>
					<ChevronDownIcon className="h-4 -rotate-90 sm:rotate-0 group-data-[open]/dropdown:rotate-0 sm:group-data-[open]/dropdown:-rotate-90 transition-transform duration-150" />
				</PopoverButton>
				<PopoverBackdrop className="hidden sm:block fixed w-screen h-screen top-0 left-0" />
				<PopoverPanel className="sm:absolute sm:inset-y-0 sm:left-full pt-4 sm:pt-0 sm:pl-4 sm:bg-white dark:sm:bg-black">
					<ul className="flex flex-col items-end gap-y-4 gap-x-5 sm:flex-row sm:items-center">
						{children?.map(({ caption, href }, index) => (
							<motion.li
								initial={{ opacity: 0, x: -40 }}
								animate={{
									opacity: 1,
									x: 0,
									transition: {
										delay: (children.length - 1 - index) * 0.02,
									},
								}}
								key={index}
							>
								{closeOnClick ? (
									<CloseButton
										as={Link}
										href={href}
										className="hover:text-zinc-600 dark:hover:text-zinc-100"
									>
										{caption}
									</CloseButton>
								) : (
									<Link href={href} className="hover:text-zinc-600 dark:hover:text-zinc-100">
										{caption}
									</Link>
								)}
							</motion.li>
						))}
					</ul>
				</PopoverPanel>
			</Popover>
		)

	if (href)
		return (
			<Link
				href={href}
				className={cn(
					'flex items-center gap-3',
					active
						? 'font-semibold text-black dark:text-white'
						: 'hover:text-zinc-600 dark:hover:text-zinc-100'
				)}
			>
				{icon && (
					<div
						className={cn(
							'h-6 w-6 rounded-md flex items-center justify-center',
							active
								? 'bg-black text-white dark:bg-white dark:text-black'
								: 'bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-300'
						)}
					>
						<Icon className="h-4" />
					</div>
				)}
				<span>{caption}</span>
			</Link>
		)

	return null
}
