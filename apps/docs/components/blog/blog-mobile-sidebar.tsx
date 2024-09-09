import { BlogCategoryMenu } from '@/components/blog/blog-category-menu'
import { db } from '@/utils/ContentDatabase'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/16/solid'
import { XMarkIcon } from '@heroicons/react/20/solid'

export async function BlogMobileSidebar() {
	const categories = await db.getCategoriesForSection('blog')
	return (
		<Popover className="group/popover h-full grow">
			<PopoverButton className="group/button focus:outline-none h-full w-full flex justify-start items-center">
				<div className="flex gap-2 h-8 px-2 -ml-2 items-center justify-center rounded group-focus/button:outline-none group-focus/button:bg-zinc-100 dark:group-focus/button:bg-zinc-800 text-black dark:text-white font-semibold">
					<Bars3Icon className="h-4 shrink-0 group-data-[open]/popover:hidden" />
					<XMarkIcon className="h-4 scale-125 shrink-0 hidden group-data-[open]/popover:block" />
					<span className="text-sm">Menu</span>
				</div>
			</PopoverButton>
			<PopoverPanel>
				<div
					className="fixed left-0 top-12 bg-white dark:bg-zinc-950 w-screen px-5 py-8 overflow-y-auto z-10"
					style={{ height: 'calc(100vh - 6.5rem)' }}
				>
					<BlogCategoryMenu categories={categories.filter((c) => !c.id.endsWith('ucg'))} />
				</div>
			</PopoverPanel>
		</Popover>
	)
}
