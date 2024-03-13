import { Category } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import Link from 'next/link'
import { Breadcrumb } from './Breadcrumb'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export async function CategoryDocsPage({ category }: { category: Category }) {
	const db = await getDb()
	const section = await db.getSection(category.sectionId)
	const sidebar = await db.getSidebarContentList({ sectionId: category.sectionId })
	const articles = await db.getCategoryArticles(section.id, category.id)

	return (
		<>
			<Header sectionId={section.id} />
			<Sidebar {...sidebar} />
			<main className={'article'}>
				<div className="page-header">
					<Breadcrumb section={section} category={category} />
					<h1>{category.title}</h1>
				</div>
				{articles.length > 0 && (
					<ul>
						{articles.map((article) => (
							<li key={article.id}>
								<Link href={`/${section.id}/${category.id}/${article.id}`}>{article.title}</Link>
							</li>
						))}
					</ul>
				)}
			</main>
		</>
	)
}
