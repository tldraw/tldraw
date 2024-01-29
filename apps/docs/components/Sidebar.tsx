'use client'

import {
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
import { Chevron } from './Icons'
import { Search } from './Search'
import { SidebarCloseButton } from './SidebarCloseButton'
import { ToggleMenuButton } from './ToggleMenuButton'

type SidebarProps = SidebarContentList

const activeLinkContext = createContext<string | null>(null)

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
	}, [pathName])

	return (
		<>
			<activeLinkContext.Provider value={activeId}>
				<div className="sidebar" onScroll={(e) => e.stopPropagation()}>
					<Search prevQuery={searchQuery} prevType={searchType} />
					<SidebarLinks headings={headings} links={links} />
					<SidebarCloseButton />
				</div>
				<ToggleMenuButton />
			</activeLinkContext.Provider>
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
			return <SidebarCategory {...props} />
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

function SidebarCategory({ title, children }: SidebarContentCategoryLink) {
	if (children.length === 0) return null
	const hasGroups = children.some((child) => !!(child as SidebarContentArticleLink).groupId)
	const groups = ['Class', 'Function', 'Variable', 'Interface', 'Enum', 'TypeAlias', 'Namespace']

	return (
		<li className="sidebar__category">
			<Link href={children[0].url} title={title} className="sidebar__link">
				{title}
			</Link>

			{hasGroups ? (
				<Accordion.Root type="multiple" defaultValue={[groups[0]]}>
					{groups.map((group) => {
						const articles = children.filter(
							(child) => (child as SidebarContentArticleLink).groupId === group
						)
						if (articles.length === 0) return null

						return (
							<Accordion.Item key={group} value={group}>
								<Accordion.Trigger
									className="sidebar__section__group__title"
									style={{ marginLeft: '8px', paddingRight: '8px' }}
								>
									{group}
									<Chevron />
								</Accordion.Trigger>
								<Accordion.Content>
									<ul className="sidebar__list" style={{ paddingLeft: '8px' }}>
										{articles.map((link) => (
											<SidebarLink key={link.url} {...link} />
										))}
									</ul>
								</Accordion.Content>
							</Accordion.Item>
						)
					})}
				</Accordion.Root>
			) : (
				<ul className="sidebar__list">
					{children.map((link) => (
						<SidebarLink key={link.url} {...link} />
					))}
				</ul>
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
	const isActive = useContext(activeLinkContext) === articleId

	return (
		<li className="sidebar__article">
			<Link href={url} className="sidebar__link" data-active={isActive}>
				{title}
			</Link>

			{isActive && (
				<ul className="sidebar__list">
					{headings
						?.filter((heading) => heading.level < 3)
						.map((heading) => (
							<li key={heading.slug}>
								<Link href={`#${heading.slug}`} className="sidebar__link">
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
