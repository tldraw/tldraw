'use client'

import { IconName } from '@/components/common/icon'
import { NavigationLink } from '@/components/navigation/link'
import { SocialLink } from '@/components/navigation/social-link'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { EllipsisVerticalIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { usePathname } from 'next/navigation'
import { ThemeSwitch } from '../common/theme-switch'
import { CloseOnNavigation } from './close-on-navigation'

export function MobileMenu({
	main,
	social,
}: {
	main: {
		caption: string
		href?: string
		children?: { caption: string; href: string }[]
		active(pathname: string): boolean
	}[]
	social: { caption: string; icon: IconName; href: string }[]
}) {
	const pathname = usePathname()

	return (
		<Popover className="group">
			<PopoverButton className="flex items-center justify-center w-8 h-8 rounded focus:outline-none focus:bg-zinc-100 text-black dark:text-white dark:focus:bg-zinc-800">
				<EllipsisVerticalIcon className="h-6 group-data-[open]:hidden" />
				<XMarkIcon className="h-6 hidden group-data-[open]:block" />
			</PopoverButton>
			<CloseOnNavigation />
			<PopoverPanel className="fixed left-0 top-14 bg-white dark:bg-zinc-950 w-screen h-screen px-5 py-8 z-30">
				<ul className="flex flex-col items-end gap-4">
					{main.map((item, index) => (
						<li key={index}>
							<NavigationLink {...item} active={item.active(pathname)} closeOnClick={false} />
						</li>
					))}
				</ul>
				<ul className="flex justify-end gap-4 mt-8">
					{social.map((item, index) => (
						<li key={index}>
							<SocialLink {...item} />
						</li>
					))}
				</ul>
				<ThemeSwitch />
			</PopoverPanel>
		</Popover>
	)
}
