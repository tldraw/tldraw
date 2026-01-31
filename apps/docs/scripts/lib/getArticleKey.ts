import { Article } from '@/types/content-types'

export function getArticleKey(article: Article): string {
	return `${article.sectionId}/${article.categoryId ?? 'ucg'}/${article.id ?? 'index'}`
}
