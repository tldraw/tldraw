/* eslint-disable no-useless-escape */
import { Article, ArticleHeadings } from '@/types/content-types'
import Link from 'next/link'

export function ArticleHeadingLinks({
	article,
	headingLinks,
}: {
	article: Article
	headingLinks: ArticleHeadings
}) {
	return headingLinks.length > 1 ? (
		<nav className="layout__headings">
			<ul className="sidebar__list sidebar__sections__list" key={article.id}>
				<li className="sidebar__section">
					<div className="sidebar__section__title uppercase_title" data-active={false}>
						On this page
					</div>
					<ul className="sidebar__list">
						{headingLinks
							.filter((heading) => heading.level < 4)
							.map((heading) => (
								<li key={heading.slug} className="sidebar__article">
									<Link href={`#${heading.slug}`} className="sidebar__link">
										{heading.level > 2 ? (
											<span className="sidebar__link__indent">{'–'}</span>
										) : null}
										<span className="sidebar__link__title">
											{heading.isCode ? (
												<code>{heading.title.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')}</code>
											) : (
												heading.title.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
											)}
										</span>
									</Link>
								</li>
							))}
					</ul>
				</li>
			</ul>
		</nav>
	) : null
}
