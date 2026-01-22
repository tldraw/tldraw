import { Navigation } from '@/components/common/navigation'
import { DocsCategoryMenu } from '@/components/docs/docs-category-menu'
import { DocsSidebarMenus } from '@/components/docs/docs-sidebar-menus'
import {
	SidebarContentArticleLink,
	SidebarContentCategoryLink,
	SidebarContentLink,
} from '@/types/content-types'
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
	const elements =
		skipFirstLevel && hasChildren(sidebar.links[0]) ? sidebar.links[0].children : sidebar.links

	// Manually copy the sync example and the editor API example to the getting started category
	if (sectionId === 'examples') {
		const gettingStartedCategory = elements.find(
			(v: any) => v?.url === '/examples/getting-started'
		) as SidebarContentCategoryLink
		const collaborationCategory = elements.find(
			(v: any) => v?.url === '/examples/collaboration'
		) as SidebarContentCategoryLink
		const editorApiCategory = elements.find(
			(v: any) => v?.url === '/examples/editor-api'
		) as SidebarContentCategoryLink
		const syncDemoExample = collaborationCategory.children.find(
			(v: any) => v?.articleId === 'sync-demo'
		) as SidebarContentArticleLink
		const editorApiExample = editorApiCategory.children.find(
			(v: any) => v?.articleId === 'api'
		) as SidebarContentArticleLink

		if (!gettingStartedCategory.children.includes(syncDemoExample)) {
			gettingStartedCategory.children.push(syncDemoExample)
		}

		if (!gettingStartedCategory.children.includes(editorApiExample)) {
			gettingStartedCategory.children.push(editorApiExample)
		}
	}

	return (
		<Navigation className="hidden md:flex">
			<DocsCategoryMenu />
			<DocsSidebarMenus menus={elements} />
		</Navigation>
	)
}

function hasChildren(
	link: SidebarContentLink
): link is SidebarContentLink & { children: SidebarContentLink[] } {
	return 'children' in link
}
