import { ArticleDetails } from '@/components/ArticleDetails'
import { ArticleNavLinks } from '@/components/ArticleNavLinks'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Mdx } from '@/components/Mdx'
import { MetaHead } from '@/components/MetaHead'
import { Sidebar } from '@/components/Sidebar'
import { Article, ArticleLinks, Category, Section, SidebarContentList } from '@/types/content-types'
import {
	getArticle,
	getArticleSource,
	getCategory,
	getLinks,
	getSection,
	getSections,
} from '@/utils/content'
import { getSidebarContentList } from '@/utils/getSidebarContentList'
import { GetStaticPaths, GetStaticProps } from 'next'
import { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { useTheme } from 'next-themes'

interface Props {
	sidebar: SidebarContentList
	section: Section
	category: Category
	article: Article
	links: ArticleLinks
	mdxSource: MDXRemoteSerializeResult
}

export default function ArticlePage({
	mdxSource,
	section,
	category,
	article,
	links,
	sidebar,
}: Props) {
	const theme = useTheme()
	return (
		<>
			<MetaHead title={article.title} description={article.description} hero={article.hero} />
			<div className="layout">
				<Sidebar {...sidebar} />
				<main className={`article ${theme.theme ?? 'light'}`}>
					<Breadcrumb section={section} category={category} />
					<h1>{article.title}</h1>
					<Mdx mdxSource={mdxSource} />
					<ArticleDetails article={article} />
					<ArticleNavLinks links={links} />
				</main>
			</div>
		</>
	)
}

export const getStaticPaths: GetStaticPaths = async () => {
	const sections = await getSections()
	const paths: { params: { sectionId: string; categoryId: string; articleId: string } }[] = []

	for (const section of sections) {
		for (const category of section.categories) {
			for (const articleId of category.articleIds) {
				paths.push({ params: { sectionId: section.id, categoryId: category.id, articleId } })
			}
		}
	}

	return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
	const sectionId = ctx.params?.sectionId?.toString() as string
	const categoryId = ctx.params?.categoryId?.toString() as string
	const articleId = ctx.params?.articleId?.toString()
	if (!articleId) throw Error()

	const sidebar = await getSidebarContentList({ sectionId, categoryId, articleId })
	const section = await getSection(sectionId)
	const category = await getCategory(sectionId, categoryId)
	const article = await getArticle(articleId)
	const links = await getLinks(articleId)
	const mdxSource = await getArticleSource(articleId)

	return { props: { article, section, category, sidebar, links, mdxSource } }
}
