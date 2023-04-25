import { ArticleDetails } from '@/components/ArticleDetails'
import { ArticleNavLinks } from '@/components/ArticleNavLinks'
import { Mdx } from '@/components/Mdx'
import { Sidebar } from '@/components/Sidebar'
import { Article, ArticleLinks, SidebarContentList } from '@/types/content-types'
import { getArticle, getArticleSource, getLinks } from '@/utils/content'
import { getSidebarContentList } from '@/utils/getSidebarContentList'
import { GetStaticProps } from 'next'
import { MDXRemoteSerializeResult } from 'next-mdx-remote'
import { useTheme } from 'next-themes'

interface Props {
	article: Article
	links: ArticleLinks
	sidebar: SidebarContentList
	mdxSource: MDXRemoteSerializeResult
}

export default function ArticlePage({ mdxSource, links, sidebar, article }: Props) {
	const theme = useTheme()

	return (
		<div className="layout">
			<Sidebar {...sidebar} />
			<main className={`article ${theme.theme ?? 'light'}`}>
				<div
					className="lockup"
					style={{
						mask: `url(/lockup.svg) center 100% / 100% no-repeat`,
						WebkitMask: `url(/lockup.svg) center 100% / 100% no-repeat`,
					}}
				/>
				<Mdx mdxSource={mdxSource} />
				<ArticleDetails article={article} />
				<ArticleNavLinks links={links} />
			</main>
		</div>
	)
}

const sectionId = 'docs'
const categoryId = 'ucg'
const articleId = 'introduction'

export const getStaticProps: GetStaticProps<Props> = async () => {
	const sidebar = await getSidebarContentList({ sectionId, categoryId, articleId })
	const article = await getArticle(articleId)
	const links = await getLinks(articleId)
	const mdxSource = await getArticleSource(articleId)

	return { props: { article, sidebar, links, mdxSource } }
}
