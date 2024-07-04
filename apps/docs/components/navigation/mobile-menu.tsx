import { IconName } from '@/components/icon'
import { NavigationLink } from '@/components/navigation/link'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { EllipsisVerticalIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { SocialLink } from './social-link'

export const MobileMenu: React.FC<{
	main: { caption: string; href: string; active: (pathname: string) => boolean }[]
	social: { caption: string; icon: IconName; href: string }[]
	pathname: string
}> = ({ main, social, pathname }) => {
	return (
		<Popover className="group">
			<PopoverButton className="flex items-center justify-center w-8 h-8 rounded focus:outline-none focus:bg-zinc-100 text-black">
				<EllipsisVerticalIcon className="h-6 group-data-[open]:hidden" />
				<XMarkIcon className="h-6 hidden group-data-[open]:block" />
			</PopoverButton>
			<PopoverPanel className="fixed left-0 top-14 bg-white w-screen h-screen px-5 py-8">
				<ul className="flex flex-col items-end gap-4">
					{main.map((item, index) => (
						<li key={index}>
							<NavigationLink {...item} pathname={pathname} />
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
			</PopoverPanel>
		</Popover>
	)
}
