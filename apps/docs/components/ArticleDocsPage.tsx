import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { ArticleDetails } from './ArticleDetails'
import { ArticleNavLinks } from './ArticleNavLinks'
import { Breadcrumb } from './Breadcrumb'
import { Header } from './Header'
import { Mdx } from './Mdx'
import { Sidebar } from './Sidebar'
import { Image } from './mdx-components/generic'

export async function ArticleDocsPage({ article }: { article: Article }) {
	const db = await getDb()
	const section = await db.getSection(article.sectionId)
	const category = await db.getCategory(article.categoryId)
	const headings = await db.getArticleHeadings(article.id)
	const links = await db.getArticleLinks(article)
	const sidebar = await db.getSidebarContentList({
		sectionId: section.id,
		categoryId: category.id,
		articleId: article.id,
	})

	const isGenerated = article.sectionId === 'reference'

	return (
		<>
			<Header sectionId={section.id} />
			<Sidebar headings={headings} {...sidebar} />
			<main className={`article${isGenerated ? ' article__api-docs' : ''}`}>
				<div className="page-header">
					<Breadcrumb section={section} category={category} />
					<h1>{article.title}</h1>
				</div>
				{article.hero && <Image alt="hero" title={article.title} src={`images/${article.hero}`} />}
				{article.content && <Mdx content={article.content} />}
				{isGenerated ? null : <ArticleDetails article={article} />}
				{links && <ArticleNavLinks links={links} />}
			</main>
		</>
	)
}
