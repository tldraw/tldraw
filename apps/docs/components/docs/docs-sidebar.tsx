import { Aside } from '@/components/common/aside'
import { DocsCategoryMenu } from '@/components/docs/docs-category-menu'
import { DocsSidebarMenu } from '@/components/docs/docs-sidebar-menu'
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
			<div className="relative grow overflow-y-auto pr-12">
				<div className="sticky top-0 h-12 -mb-12 w-full bg-gradient-to-b from-white" />
				{elements.map((menu: any, index: number) => (
					// @ts-ignore
					<DocsSidebarMenu key={index} title={menu.title} elements={menu.children} />
				))}
				<div className="sticky bottom-0 h-12 w-full bg-gradient-to-t from-white" />
			</div>
		</Aside>
	)
}
