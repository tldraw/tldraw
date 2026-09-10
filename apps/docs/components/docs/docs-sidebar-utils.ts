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

// Examples duplicated into the examples sidebar's "Getting started" category. Matched by url,
// not article id: ids (`examples/collaboration/sync-demo`) change when an example moves category.
const EXAMPLES_ALSO_IN_GETTING_STARTED = ['/examples/sync-demo', '/examples/api']

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

	if (sectionId === 'examples') {
		const categories = elements.filter(
			(v): v is SidebarContentCategoryLink => v.type === 'category'
		)
		const gettingStartedCategory = categories.find((v) => v.url === '/examples/getting-started')

		// An example that's been renamed or moved won't be found. Pushing `undefined` would crash
		// the sidebar, which renders every entry. The cached link tree is shared between renders,
		// so don't push the same example twice either.
		if (gettingStartedCategory) {
			for (const url of EXAMPLES_ALSO_IN_GETTING_STARTED) {
				if (gettingStartedCategory.children.some((v) => v.url === url)) continue
				const example = categories
					.flatMap((category) => category.children)
					.find((v): v is SidebarContentArticleLink => v.type === 'article' && v.url === url)
				if (example) gettingStartedCategory.children.push(example)
			}
		}
	}

	return elements
}
