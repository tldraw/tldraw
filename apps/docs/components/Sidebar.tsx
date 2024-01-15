'use client'

import {
	SidebarContentArticleLink,
	SidebarContentCategoryLink,
	SidebarContentLink,
	SidebarContentList,
	SidebarContentSectionLink,
} from '@/types/content-types'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect } from 'react'
import { Search } from './Search'
import { SidebarCloseButton } from './SidebarCloseButton'
import { ToggleMenuButton } from './ToggleMenuButton'

type SidebarProps = SidebarContentList

const activeLinkContext = createContext<string | null>(null)

export function Sidebar({ links, sectionId, categoryId, articleId }: SidebarProps) {
	const activeId = articleId ?? categoryId ?? sectionId

	const pathName = usePathname()

	useEffect(() => {
		document.body.classList.remove('sidebar-open')
	}, [pathName])

	return (
		<>
			<activeLinkContext.Provider value={activeId}>
				<div className="sidebar" onScroll={(e) => e.stopPropagation()}>
					<Search activeId={activeId} />
					<SidebarLinks links={links} />
					<SidebarCloseButton />
				</div>
				<ToggleMenuButton />
			</activeLinkContext.Provider>
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
			{title && (
				<Link href={children[0].url} title={title} className="sidebar__section__title">
					{title}
				</Link>
			)}
			<ul className="sidebar__list">
				{children.map((link) => (
					<SidebarLink key={link.url} {...link} />
				))}
			</ul>
		</li>
	)
}

function SidebarCategory({ title, children }: SidebarContentCategoryLink) {
	if (children.length === 0) return null

	return (
		<li className="sidebar__category">
			<Link href={children[0].url} title={title} className="sidebar__link">
				{title}
			</Link>
			<ul className="sidebar__list">
				{children.map((link) => (
					<SidebarLink key={link.url} {...link} />
				))}
			</ul>
			<hr />
		</li>
	)
}

function SidebarArticle({ title, url, articleId }: SidebarContentArticleLink) {
	const isActive = useContext(activeLinkContext) === articleId

	return (
		<li className="sidebar__article">
			<Link href={url}>
				<div className="sidebar__link" data-active={isActive}>
					{title}
				</div>
			</Link>
		</li>
	)
}
