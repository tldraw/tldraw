import { Article, Category, Section } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import Link from 'next/link'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export async function SectionDocsPage({ section }: { section: Section }) {
	const db = await getDb()

	const sidebar = await db.getSidebarContentList({ sectionId: section.id })

	const categories = [] as Category[]
	const articles: Article[] = []

	const sectionCategories = await db.getCategoriesForSection(section.id)

	for (const category of sectionCategories) {
		if (category.id === section.id + '_ucg') {
			const categoryArticles = await db.getCategoryArticles(section.id, category.id)
			for (const article of categoryArticles) {
				articles.push(article)
			}
		} else {
			// If the count of articles for this category is greater than zero...
			const articleCount = await db.getCategoryArticlesCount(section.id, category.id)

			if (articleCount > 0) {
				categories.push(category)
			}
		}
	}

	return (
		<>
			<Header activeId={section.id} />
			<Sidebar {...sidebar} />
			<main className="article">
				<div className="page-header">
					<h1>{section.title}</h1>
				</div>
				{articles.length > 0 && (
					<ul>
						{articles.map((articleLink) => {
							return (
								<Link key={articleLink.id} href={articleLink.path!}>
									<li>{articleLink.title}</li>
								</Link>
							)
						})}
					</ul>
				)}
				{categories.length > 0 && (
					<ul>
						{categories.map((category) =>
							category.id === 'ucg' ? null : (
								<Link key={category.id} href={`/${section.id}/${category.id}`}>
									{category.id === 'ucg' ? null : <li>{category.title}</li>}
								</Link>
							)
						)}
					</ul>
				)}
			</main>
		</>
	)
}
