import { DocsCategoryMenu } from '@/components/docs/docs-category-menu'
import { DocsSidebarMenu } from '@/components/docs/docs-sidebar-menu'
import { db } from '@/utils/ContentDatabase'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Bars3Icon } from '@heroicons/react/16/solid'
import { XMarkIcon } from '@heroicons/react/20/solid'

export async function DocsMobileSidebar({
	sectionId,
	categoryId,
	articleId,
}: {
	sectionId?: string
	categoryId?: string
	articleId?: string
}) {
	const sidebar = await db.getSidebarContentList({ sectionId, categoryId, articleId })
	const skipFirstLevel = ['reference', 'examples'].includes(sectionId ?? '')
	// @ts-ignore
	const elements = skipFirstLevel ? sidebar.links[0].children : sidebar.links

	// Manually copy the sync example and the editor API example to the getting started category
	if (sectionId === 'examples') {
		const gettingStartedCategory = elements.find((v: any) => v?.url === '/examples/getting-started')
		const collaborationCategory = elements.find((v: any) => v?.url === '/examples/collaboration')
		const editorApiCategory = elements.find((v: any) => v?.url === '/examples/editor-api')
		const syncDemoExample = collaborationCategory.children.find(
			(v: any) => v?.articleId === 'sync-demo'
		)
		const editorApiExample = editorApiCategory.children.find((v: any) => v?.articleId === 'api')
		if (!gettingStartedCategory.children.includes(syncDemoExample)) {
			gettingStartedCategory.children.push(syncDemoExample)
		}
		if (!gettingStartedCategory.children.includes(editorApiExample)) {
			gettingStartedCategory.children.push(editorApiExample)
		}
	}

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
					<DocsCategoryMenu />
					{elements.map((menu: any, index: number) => (
						// @ts-ignore
						<DocsSidebarMenu key={index} title={menu.title} elements={menu.children} />
					))}
				</div>
			</PopoverPanel>
		</Popover>
	)
}
