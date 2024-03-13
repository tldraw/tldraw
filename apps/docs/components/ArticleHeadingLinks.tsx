/* eslint-disable no-useless-escape */
import { Article, ArticleHeading, ArticleHeadings } from '@/types/content-types'
import Link from 'next/link'

export function ArticleHeadingLinks({
	headingLinks,
}: {
	article: Article
	headingLinks: ArticleHeadings
}) {
	const linksToShow = headingLinks.filter((heading) => heading.level < 4)

	if (linksToShow.length <= 1) return null

	return (
		<nav className="layout__headings">
			<ul className="sidebar__list sidebar__sections__list">
				<li className="sidebar__section">
					<div className="sidebar__section__title uppercase_title">On this page</div>
					<ul className="sidebar__list">
						{linksToShow.map((heading) => (
							<HeaderLink key={heading.slug} heading={heading} />
						))}
					</ul>
				</li>
			</ul>
		</nav>
	)
}

function HeaderLink({ heading }: { heading: ArticleHeading }) {
	return (
		<li className="sidebar__article">
			<Link href={`#${heading.slug}`} className="sidebar__link">
				{heading.level > 2 ? <span className="sidebar__link__indent">{'–'}</span> : null}
				<span className="sidebar__link__title">
					{heading.isCode ? (
						<code>{heading.title.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')}</code>
					) : (
						heading.title.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
					)}
				</span>
			</Link>
		</li>
	)
}
