import { Breadcrumb } from '@/components/Breadcrumb'
import { Mdx } from '@/components/Mdx'
import { MetaHead } from '@/components/MetaHead'
import { Sidebar } from '@/components/Sidebar'
import { Article, Category, Section, SidebarContentList } from '@/types/content-types'
import {
	getArticle,
	getArticleSource,
	getArticles,
	getCategory,
	getLinks,
	getSection,
	getSections,
} from '@/utils/content'
import { getSidebarContentList } from '@/utils/getSidebarContentList'
import { GetStaticPaths, GetStaticProps } from 'next'
import { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import ArticlePage, { ArticleProps } from './[childId]/[articleId]'

type SectionProps = {
	type: 'section'
	sidebar: SidebarContentList
	section: Section
	categories: { category: Category; articles: Article[] }[]
	mdxSource: MDXRemoteSerializeResult | null
}

type Props = SectionProps | ArticleProps

export default function SectionListPage(props: Props) {
	const theme = useTheme()
	if (props.type === 'article') {
		return <ArticlePage {...props} />
	}

	const { sidebar, section, categories, mdxSource } = props
	const ucg = categories.find((category) => category.category.id === 'ucg')!
	return (
		<>
			<MetaHead title={section.title} description={section.description} />
			<div className="layout">
				<Sidebar {...sidebar} />
				<main className={`article list ${theme.theme ?? 'light'}`}>
					<Breadcrumb />
					<h1>{section.title}</h1>
					{mdxSource && <Mdx mdxSource={mdxSource} />}
					{ucg.articles.length > 0 ? (
						<>
							<ul>
								{ucg.articles.map((article) => {
									return (
										<Link key={article.id} href={`/${section.id}/${ucg.category.id}/${article.id}`}>
											<li>{article.title}</li>
										</Link>
									)
								})}
							</ul>
						</>
					) : null}
					<ul>
						{categories.map((category) =>
							category.category.id === 'ucg' ? null : (
								<Link key={category.category.id} href={`/${section.id}/${category.category.id}`}>
									{category.category.id === 'ucg' ? null : <li>{category.category.title}</li>}
								</Link>
							)
						)}
					</ul>
				</main>
			</div>
		</>
	)
}

export const getStaticPaths: GetStaticPaths = async () => {
	const sections = await getSections()
	const paths: { params: { sectionId: string } }[] = []

	for (const section of sections) {
		if (section.id !== 'getting-started') {
			paths.push({ params: { sectionId: section.id } })
			continue
		}

		// Add paths for getting-started articles (not the section itself)
		// ... because we keep those at the top level of the sidebar
		for (const category of section.categories) {
			if (category.id !== 'ucg') continue
			for (const articleId of category.articleIds) {
				paths.push({ params: { sectionId: articleId } })
			}
		}
	}

	return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
	const id = ctx.params?.sectionId?.toString()
	if (!id) throw Error()

	// If the path goes to an article in the getting-started section
	// ... show the article page instead
	// ... because we keep those ones at the top level
	const sections = await getSections()
	if (!sections.some((section) => section.id === id)) {
		const sectionId = 'getting-started'
		const categoryId = 'ucg'
		const articleId = id
		const sidebar = await getSidebarContentList({ sectionId, categoryId, articleId })
		const section = await getSection(sectionId)
		const category = await getCategory(sectionId, categoryId)
		const article = await getArticle(articleId)
		const links = await getLinks(articleId)
		const mdxSource = await getArticleSource(articleId)
		return {
			props: {
				type: 'article',
				sidebar,
				section,
				category,
				article,
				links,
				mdxSource,
			},
		}
	}

	// Otherwise, show the section page
	const sectionId = id
	const sidebar = await getSidebarContentList({ sectionId })
	const articles = await getArticles()
	const section = await getSection(sectionId)
	const categories = [] as { category: Category; articles: Article[] }[]

	for (const category of section.categories) {
		categories.push({ category, articles: category.articleIds.map((id) => articles[id]) })
	}

	const article = articles[sectionId + '_index'] ?? null
	const mdxSource = article ? await getArticleSource(sectionId + '_index') : null

	return { props: { type: 'section', sidebar, section, categories, mdxSource } }
}
