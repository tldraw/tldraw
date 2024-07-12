import { CategoryMenu } from '@/components/blog/category-menu'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/16/solid'
import { XMarkIcon } from '@heroicons/react/20/solid'

export const MobileSidebar: React.FC<{}> = ({}) => {
	return (
		<Popover className="group/popover h-full grow">
			<PopoverButton className="group/button focus:outline-none h-full w-full flex justify-start items-center">
				<div className="flex gap-2 h-8 px-2 -ml-2 items-center justify-center rounded group-focus/button:outline-none group-focus/button:bg-zinc-100 text-black font-semibold">
					<Bars3Icon className="h-4 shrink-0 group-data-[open]/popover:hidden" />
					<XMarkIcon className="h-4 scale-125 shrink-0 hidden group-data-[open]/popover:block" />
					<span className="text-sm">Menu</span>
				</div>
			</PopoverButton>
			<PopoverPanel>
				<div
					className="fixed left-0 top-12 bg-white w-screen px-5 py-8 overflow-y-auto z-10"
					style={{ height: 'calc(100vh - 6.5rem)' }}
				>
					<CategoryMenu />
				</div>
			</PopoverPanel>
		</Popover>
	)
}
