import { Aside } from '@/components/common/aside'
import { DocsCategoryMenu } from '@/components/docs/docs-category-menu'
import { DocsSidebarMenus } from '@/components/docs/docs-sidebar-menus'
import { getDb } from '@/utils/ContentDatabase'

export const DocsSidebar: React.FC<{
	sectionId?: string
	categoryId?: string
	articleId?: string
}> = async ({ sectionId, categoryId, articleId }) => {
	const db = await getDb()
	const sidebar = await db.getSidebarContentList({ sectionId, categoryId, articleId })
	const skipFirstLevel = ['reference', 'examples'].includes(sectionId ?? '')
	// @ts-ignore
	const elements = skipFirstLevel ? sidebar.links[0].children : sidebar.links

	return (
		<Aside className="hidden md:flex">
			<DocsCategoryMenu />
			<DocsSidebarMenus menus={elements} />
		</Aside>
	)
}
