import { Breadcrumb } from '@/components/Breadcrumb'
import { Mdx } from '@/components/Mdx'
import { MetaHead } from '@/components/MetaHead'
import { Sidebar } from '@/components/Sidebar'
import { Article, Category, Section, SidebarContentList } from '@/types/content-types'
import { getArticleSource, getArticles, getSection, getSections } from '@/utils/content'
import { getSidebarContentList } from '@/utils/getSidebarContentList'
import { GetStaticPaths, GetStaticProps } from 'next'
import { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { useTheme } from 'next-themes'
import Link from 'next/link'

type Props = {
	sidebar: SidebarContentList
	section: Section
	categories: { category: Category; articles: Article[] }[]
	mdxSource: MDXRemoteSerializeResult | null
}

export default function SectionListPage({ sidebar, section, categories, mdxSource }: Props) {
	const theme = useTheme()
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
		paths.push({ params: { sectionId: section.id } })
	}

	return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
	const sectionId = ctx.params?.sectionId?.toString()
	if (!sectionId) throw Error()

	const sidebar = await getSidebarContentList({
		sectionId,
	})

	const articles = await getArticles()
	const section = await getSection(sectionId)
	const categories = [] as { category: Category; articles: Article[] }[]

	for (const category of section.categories) {
		categories.push({ category, articles: category.articleIds.map((id) => articles[id]) })
	}

	const article = articles[sectionId + '_index'] ?? null
	const mdxSource = article ? await getArticleSource(sectionId + '_index') : null

	return { props: { sidebar, section, categories, mdxSource } }
}
