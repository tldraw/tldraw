import { getDb } from '@/utils/ContentDatabase'
import { CategoryMenu } from './navigation/category-menu'
import { SidebarMenu } from './navigation/sidebar-menu'

export const Sidebar: React.FC<{
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
		<aside className="w-60 shrink-0 flex flex-col">
			<CategoryMenu />
			<div className="relative grow overflow-y-auto">
				<div className="sticky top-0 h-12 -mb-12 w-full bg-gradient-to-b from-white" />
				{elements.map((menu: any, index: number) => (
					// @ts-ignore
					<SidebarMenu key={index} title={menu.title} elements={menu.children} />
				))}
				<div className="sticky bottom-0 h-12 w-full bg-gradient-to-t from-white" />
			</div>
		</aside>
	)
}
