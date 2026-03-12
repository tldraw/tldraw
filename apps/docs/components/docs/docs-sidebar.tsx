import { Navigation } from '@/components/common/navigation'
import { DocsCategoryMenu } from '@/components/docs/docs-category-menu'
import { DocsSidebarMenus } from '@/components/docs/docs-sidebar-menus'
import { processSidebarContent } from '@/components/docs/docs-sidebar-utils'
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
	const elements = processSidebarContent(sidebar, sectionId)

	return (
		<Navigation className="hidden md:flex">
			<DocsCategoryMenu />
			<DocsSidebarMenus menus={elements} />
		</Navigation>
	)
}
