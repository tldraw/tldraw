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
import { UIEvent, createContext, useContext, useEffect, useRef } from 'react'
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

// N.B. UGH, the sidebar's scroll position keeps getting lost when navigation occurs
// and we keep track of the last known position here outside of the component because
// it keeps re-rendering.
let scrollPosition = 0

export function Sidebar({ links, sectionId, categoryId, articleId }: SidebarProps) {
	const activeId = articleId ?? categoryId ?? sectionId
	const sidebarRef = useRef<HTMLDivElement>(null)

	const pathName = usePathname()

	useEffect(() => {
		document.body.classList.remove('sidebar-open')

		const sidebarEl = sidebarRef.current
		if (!sidebarEl) return

		sidebarEl.scrollTo(0, scrollPosition)

		const activeLink = document.querySelector('.sidebar__nav [data-active=true]') as HTMLElement
		if (
			activeLink &&
			(activeLink.offsetTop < sidebarEl.scrollTop ||
				activeLink.offsetTop > sidebarEl.scrollTop + sidebarEl.clientHeight)
		) {
			// The above will *mostly* work to keep the position but we have some accordions that will collapse
			// (like in the Reference docs) and we need to scroll to the active item.
			activeLink.scrollIntoView({ block: 'center' })
		}
	}, [pathName])

	const handleScroll = (e: UIEvent) => {
		e.stopPropagation()
		scrollPosition = sidebarRef.current?.scrollTop ?? 0
	}

	return (
		<>
			<linkContext.Provider value={{ activeId, articleId, categoryId, sectionId }}>
				<div ref={sidebarRef} className="sidebar scroll-light" onScroll={handleScroll}>
					<Search />
					<div className="sidebar__section__links">
						<SectionLinks sectionId={sectionId} />
					</div>
					<SidebarLinks links={links} />
					<SidebarCloseButton />
				</div>
				<ToggleMenuButton />
			</linkContext.Provider>
		</>
	)
}

export function SidebarLinks({ links }: { links: SidebarContentLink[] }) {
	return (
		<nav className="sidebar__nav">
			<ul className="sidebar__list sidebar__sections__list">
				{links.map((link) => (
					<SidebarLink key={link.url} {...link} />
				))}
			</ul>
		</nav>
	)
}

function SidebarLink(props: SidebarContentLink) {
	switch (props.type) {
		case 'section': {
			return <SidebarSection {...props} />
		}
		case 'article': {
			return <SidebarArticle {...props} />
		}
		case 'category': {
			return <SidebarCategory {...props} />
		}
	}
}

function SidebarSection({ title, children }: SidebarContentSectionLink) {
	if (children.length === 0) return null

	return (
		<li className="sidebar__section">
			{title && <span className="sidebar__section__title uppercase_title">{title}</span>}
			<ul className="sidebar__list">
				{children.map((link) => (
					<SidebarLink key={link.url} {...link} />
				))}
			</ul>
		</li>
	)
}

function SidebarCategory({ title, children }: SidebarContentCategoryLink) {
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
					<span className="sidebar__link sidebar__category__title">{title}</span>
					<Accordion.Root
						type="multiple"
						defaultValue={[`${linkCtx?.categoryId}-${activeGroup}-${linkCtx?.articleId}`]}
					>
						{groups.map((group) => {
							const articles = children.filter(
								(child) => (child as SidebarContentArticleLink).groupId === group
							)
							if (articles.length === 0) return null

							const value = `${linkCtx?.categoryId}-${group}-${linkCtx?.articleId}`
							return (
								<Accordion.Item key={value} value={value}>
									<Accordion.Trigger className="sidebar__section__group__title">
										{group}
										<Chevron />
									</Accordion.Trigger>
									<Accordion.Content>
										<ul className="sidebar__list sidebar__group">
											{articles.map((link) => (
												<SidebarLink key={link.url} {...link} />
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
					<Link
						href={children[0].url}
						title={title}
						className="sidebar__link sidebar__category__title"
					>
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
								key={`${heading.slug}`}
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
