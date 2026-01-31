import {
	SidebarContentArticleLink,
	SidebarContentCategoryLink,
	SidebarContentLink,
} from '@/types/content-types'

/**
 * Type guard to check if a sidebar link has children
 */
function hasChildren(
	link: SidebarContentLink
): link is SidebarContentLink & { children: SidebarContentLink[] } {
	return 'children' in link
}

/**
 * Processes sidebar content by extracting elements and handling special cases
 * like copying examples to the getting-started category.
 */
export function processSidebarContent(
	sidebar: Awaited<ReturnType<typeof import('@/utils/ContentDatabase').db.getSidebarContentList>>,
	sectionId?: string
): SidebarContentLink[] {
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

	return elements
}
