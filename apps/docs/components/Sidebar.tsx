'use client'

import {
	APIGroup,
	ArticleHeadings,
	SidebarContentArticleLink,
	SidebarContentCategoryLink,
	SidebarContentLink,
	SidebarContentList,
	SidebarContentSectionLink,
} from '@/types/content-types'
import * as Accordion from '@radix-ui/react-accordion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect } from 'react'
import { SectionLinks } from './Header'
import { Chevron } from './Icons'
import { Search } from './Search'
import { SidebarCloseButton } from './SidebarCloseButton'
import { ToggleMenuButton } from './ToggleMenuButton'

type SidebarProps = SidebarContentList

const linkContext = createContext<{
	activeId: string | null
	articleId: string | null
	categoryId: string | null
	sectionId: string | null
} | null>(null)

export function Sidebar({
	headings,
	links,
	sectionId,
	categoryId,
	articleId,
	searchQuery,
	searchType,
}: SidebarProps) {
	const activeId = articleId ?? categoryId ?? sectionId

	const pathName = usePathname()

	useEffect(() => {
		document.body.classList.remove('sidebar-open')

		document.querySelector('.sidebar__nav [data-active=true]')?.scrollIntoView({ block: 'center' })

		// XXX(mime): scrolling the sidebar into position also scrolls the page to the wrong
		// spot. this compensates for that but, ugh.
		document.documentElement.scrollTop = 0
	}, [pathName])

	return (
		<>
			<linkContext.Provider value={{ activeId, articleId, categoryId, sectionId }}>
				<div className="sidebar scroll-light" onScroll={(e) => e.stopPropagation()}>
					<Search prevQuery={searchQuery} prevType={searchType} />
					<div className="sidebar__section__links">
						<SectionLinks sectionId={sectionId} />
					</div>
					<SidebarLinks headings={headings} links={links} />
					<SidebarCloseButton />
				</div>
				<ToggleMenuButton />
			</linkContext.Provider>
		</>
	)
}

export function SidebarLinks({
	headings,
	links,
}: {
	headings?: ArticleHeadings
	links: SidebarContentLink[]
}) {
	return (
		<nav className="sidebar__nav">
			<ul className="sidebar__list sidebar__sections__list">
				{links.map((link) => (
					<SidebarLink key={link.url} headings={headings} {...link} />
				))}
			</ul>
		</nav>
	)
}

function SidebarLink({ headings, ...props }: SidebarContentLink & { headings?: ArticleHeadings }) {
	switch (props.type) {
		case 'section': {
			return <SidebarSection headings={headings} {...props} />
		}
		case 'article': {
			return <SidebarArticle headings={headings} {...props} />
		}
		case 'category': {
			return <SidebarCategory headings={headings} {...props} />
		}
	}
}

function SidebarSection({
	title,
	children,
	headings,
}: SidebarContentSectionLink & { headings?: ArticleHeadings }) {
	if (children.length === 0) return null

	return (
		<li className="sidebar__section">
			{title && <span className="sidebar__section__title">{title}</span>}
			<ul className="sidebar__list">
				{children.map((link) => (
					<SidebarLink key={link.url} headings={headings} {...link} />
				))}
			</ul>
		</li>
	)
}

function SidebarCategory({
	title,
	children,
	headings,
}: SidebarContentCategoryLink & { headings?: ArticleHeadings }) {
	const linkCtx = useContext(linkContext)
	if (children.length === 0) return null
	const hasGroups = children.some((child) => !!(child as SidebarContentArticleLink).groupId)
	const activeArticle = children.find(
		(child) => (child as SidebarContentArticleLink).articleId === linkCtx?.articleId
	)
	const activeGroup = activeArticle && (activeArticle as SidebarContentArticleLink).groupId
	const groups = Object.values(APIGroup)

	return (
		<li className="sidebar__category">
			{hasGroups ? (
				<>
					<span className="sidebar__link">{title}</span>
					<Accordion.Root
						type="multiple"
						defaultValue={[`${linkCtx?.categoryId}-${activeGroup}-${linkCtx?.articleId}`]}
					>
						{groups.map((group) => {
							const articles = children.filter(
								(child) => (child as SidebarContentArticleLink).groupId === group
							)
							if (articles.length === 0) return null

							return (
								<Accordion.Item
									key={group}
									value={`${linkCtx?.categoryId}-${group}-${linkCtx?.articleId}`}
								>
									<Accordion.Trigger
										className="sidebar__section__group__title"
										style={{ marginLeft: '8px', paddingRight: '8px' }}
									>
										{group}
										<Chevron />
									</Accordion.Trigger>
									<Accordion.Content>
										<ul className="sidebar__list sidebar__group" style={{ paddingLeft: '8px' }}>
											{articles.map((link) => (
												<SidebarLink key={link.url} headings={headings} {...link} />
											))}
										</ul>
									</Accordion.Content>
								</Accordion.Item>
							)
						})}
					</Accordion.Root>
				</>
			) : (
				<>
					<Link href={children[0].url} title={title} className="sidebar__link">
						{title}
					</Link>
					<ul className="sidebar__list">
						{children.map((link) => (
							<SidebarLink key={link.url} {...link} />
						))}
					</ul>
				</>
			)}
			<hr />
		</li>
	)
}

function SidebarArticle({
	title,
	url,
	articleId,
	headings,
}: SidebarContentArticleLink & { headings?: ArticleHeadings }) {
	const activeLink = useContext(linkContext)
	const isActive = activeLink?.activeId === articleId

	return (
		<li className="sidebar__article">
			<Link href={url} title={title} className="sidebar__link" data-active={isActive}>
				{title}
			</Link>

			{isActive && (
				<ul className="sidebar__list">
					{headings
						?.filter((heading) => heading.level < 4)
						.map((heading) => (
							<li
								key={heading.slug}
								data-heading-level={heading.title === 'Constructor' ? 2 : heading.level}
							>
								<Link href={`#${heading.slug}`} title={heading.title} className="sidebar__link">
									{heading.isCode ? (
										<code>{heading.title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</code>
									) : (
										heading.title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
									)}
								</Link>
							</li>
						))}
				</ul>
			)}
		</li>
	)
}
