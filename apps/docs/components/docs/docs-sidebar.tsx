import { Navigation } from '@/components/common/navigation'
import { DocsCategoryMenu } from '@/components/docs/docs-category-menu'
import { DocsSidebarMenus } from '@/components/docs/docs-sidebar-menus'
import { db } from '@/utils/ContentDatabase'

export async function DocsSidebar({
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

	// Manually copy the sync demo example to the getting started category
	if (sectionId === 'examples') {
		const gettingStartedCategory = elements.find((v: any) => v?.url === '/examples/getting-started')
		const collaborationCategory = elements.find((v: any) => v?.url === '/examples/collaboration')
		const syncDemoExample = collaborationCategory?.children[0]
		gettingStartedCategory?.children.push(syncDemoExample)
	}

	return (
		<Navigation className="hidden md:flex">
			<DocsCategoryMenu />
			<DocsSidebarMenus menus={elements} />
		</Navigation>
	)
}
