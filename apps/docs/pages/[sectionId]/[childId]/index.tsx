import { Breadcrumb } from '@/components/Breadcrumb'
import { Mdx } from '@/components/Mdx'
import { MetaHead } from '@/components/MetaHead'
import { Sidebar } from '@/components/Sidebar'
import ArticlePage from '@/pages'
import { Article, Category, Section, SidebarContentList } from '@/types/content-types'
import {
	getArticleSource,
	getArticles,
	getCategory,
	getSection,
	getSections,
} from '@/utils/content'
import { getSidebarContentList } from '@/utils/getSidebarContentList'
import { GetStaticPaths, GetStaticProps } from 'next'
import { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { ArticleProps } from './[articleId]'

type CategoryProps = {
	type: 'category'
	sidebar: SidebarContentList
	section: Section
	category: Category
	articles: Article[]
	mdxSource: MDXRemoteSerializeResult | null
}

type ChildProps = CategoryProps | ArticleProps

export default function CategoryListPage(props: ChildProps) {
	const theme = useTheme()

	if (props.type === 'article') {
		return <ArticlePage {...props} />
	}

	const { sidebar, section, category, articles, mdxSource } = props

	const ungrouped: Article[] = []
	const groupedArticles = Object.fromEntries(
		category.groups.map((group) => [group.id, { group, articles: [] as Article[] }])
	)

	for (const article of articles) {
		if (article.groupId) {
			if (groupedArticles[article.groupId]) {
				groupedArticles[article.groupId].articles.push(article)
			} else {
				throw Error(
					`Article ${article.id} has groupId ${article.groupId} but no such group exists.`
				)
			}
		} else {
			ungrouped.push(article)
		}
	}

	return (
		<>
			<MetaHead title={category.title} description={category.description} />
			<div className="layout">
				<Sidebar {...sidebar} />
				<main className={`article list ${theme.theme ?? 'light'}`}>
					<Breadcrumb section={section} />
					<h1>{category.title}</h1>
					{mdxSource && <Mdx mdxSource={mdxSource} />}
					{Object.values(groupedArticles)
						.filter((g) => g.articles.length > 0)
						.map(({ group, articles }) => (
							<>
								<h2>{group.title}</h2>
								<ul>
									{articles.map((article) => (
										<Link key={article.id} href={`/${section.id}/${category.id}/${article.id}`}>
											<li>{article.title}</li>
										</Link>
									))}
								</ul>
							</>
						))}
					{ungrouped.length > 0 ? (
						<ul>
							{ungrouped.map((article) => (
								<Link key={article.id} href={`/${section.id}/${category.id}/${article.id}`}>
									<li>{article.title}</li>
								</Link>
							))}
						</ul>
					) : null}
				</main>
			</div>
		</>
	)
}

export const getStaticPaths: GetStaticPaths = async () => {
	const sections = await getSections()
	const paths: { params: { sectionId: string; childId: string } }[] = []

	for (const section of sections) {
		if (section.categories) {
			for (const category of section.categories) {
				paths.push({ params: { sectionId: section.id, childId: category.id } })
			}
		}
	}

	return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps<ChildProps> = async (ctx) => {
	const sectionId = ctx.params?.sectionId?.toString() as string
	const categoryId = ctx.params?.childId?.toString()
	if (!categoryId || !sectionId) throw Error()

	const sidebar = await getSidebarContentList({
		sectionId,
		categoryId,
	})

	const articles = await getArticles()
	const section = await getSection(sectionId)
	const category = await getCategory(sectionId, categoryId)
	const categoryArticles = category.articleIds.map((id) => articles[id])

	const article = articles[categoryId + '_index'] ?? null
	const mdxSource = article ? await getArticleSource(categoryId + '_index') : null

	return {
		props: {
			type: 'category',
			sidebar,
			section,
			category,
			articles: categoryArticles,
			mdxSource,
		},
	}
}
