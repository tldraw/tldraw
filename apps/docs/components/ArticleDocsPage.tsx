import { Article } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { ArticleDetails } from './ArticleDetails'
import { ArticleHeadingLinks } from './ArticleHeadingLinks'
import { ArticleNavLinks } from './ArticleNavLinks'
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

	return (
		<>
			<Header sectionId={section.id} />
			<Sidebar {...sidebar} />
			<main className="main-content article">
				<div className="page-header">
					<h1>{article.title}</h1>
				</div>
				{article.hero && <Image alt="hero" title={article.title} src={`images/${article.hero}`} />}
				{article.content && <Mdx content={article.content} />}
				<ArticleDetails article={article} />
				{links && <ArticleNavLinks links={links} />}
			</main>
			<ArticleHeadingLinks article={article} headingLinks={headings} />
		</>
	)
}
