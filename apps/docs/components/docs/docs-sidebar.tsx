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

	return (
		<Navigation className="hidden md:flex">
			<DocsCategoryMenu />
			<DocsSidebarMenus menus={elements} />
		</Navigation>
	)
}
