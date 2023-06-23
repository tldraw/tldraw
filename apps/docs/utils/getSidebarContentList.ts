import { SidebarContentLink, SidebarContentList } from '../types/content-types'
import { getArticles, getSections } from './content'

export async function getSidebarContentList({
	sectionId,
	categoryId,
	articleId,
}: {
	sectionId?: string
	categoryId?: string
	articleId?: string
}): Promise<SidebarContentList> {
	const links: SidebarContentLink[] = []

	const articles = await getArticles()

	for (const section of await getSections()) {
		const children: SidebarContentLink[] = []

		if (section.id === 'gen') {
			links.push({ type: 'article', title: 'API Reference', url: '/gen' })
			continue
		}

		// If the article is in the getting-started section
		// ... we place it at the top level of the sidebar
		// ... so let's simplify its URL to reflect that
		const sectionUrl = section.id === 'getting-started' ? '' : `/${section.id}`

		for (const category of section.categories) {
			if (category.id === 'ucg') {
				continue
			} else {
				children.push({
					type: 'category',
					title: category.title,
					url: `${sectionUrl}/${category.id}`,
					children: category.articleIds.map((articleId) => {
						const article = articles[articleId]
						return {
							type: 'article' as const,
							title: article.title,
							url: `${sectionUrl}/${category.id}/${articleId}`,
						}
					}),
				})
			}
		}

		for (const category of section.categories) {
			if (category.id === 'ucg') {
				children.push(
					...category.articleIds.map((articleId) => {
						const article = articles[articleId]
						return {
							type: 'article' as const,
							title: article.title,
							url: `${sectionUrl}/${articleId}`,
						}
					})
				)
			}
		}

		links.push({ type: 'section', title: section.title, url: sectionUrl, children })
	}

	return {
		sectionId: sectionId ?? null,
		categoryId: categoryId ?? null,
		articleId: articleId ?? null,
		links,
	}
}
