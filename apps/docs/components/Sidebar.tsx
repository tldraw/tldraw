import {
	SidebarContentArticleLink,
	SidebarContentCategoryLink,
	SidebarContentLink,
	SidebarContentList,
	SidebarContentSectionLink,
} from '@/types/content-types'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Search } from './Search'
import { ThemeSwitcher } from './ThemeSwitcher'

type SidebarProps = SidebarContentList

export function Sidebar({ links, sectionId, categoryId, articleId }: SidebarProps) {
	const [menuOpen, setMenuOpen] = useState(false)

	const activeId = articleId ?? categoryId ?? sectionId

	const router = useRouter()

	useEffect(() => {
		setMenuOpen(false)
	}, [router.asPath])

	return (
		<>
			<div className="sidebar" data-open={menuOpen}>
				<div className="sidebar__buttons">
					<ThemeSwitcher />
					<div className="sidebar__buttons__socials">
						<a
							href="https://twitter.com/tldraw"
							className="sidebar__button icon-button"
							title="twitter"
						>
							<Icon icon="twitter" />
						</a>
						<a
							href="https://github.com/tldraw/tldraw"
							className="sidebar__button icon-button"
							title="github"
						>
							<Icon icon="github" />
						</a>
						<a
							href="https://discord.com/invite/SBBEVCA4PG"
							className="sidebar__button icon-button"
							title="discord"
						>
							<Icon icon="discord" />
						</a>
					</div>
				</div>
				<Search activeId={activeId} />
				<nav className="sidebar__nav">
					<ul className="sidebar__list sidebar__sections__list">
						{links.map((link) => (
							<SidebarLink key={link.url} {...link} />
						))}
					</ul>
				</nav>
				<div className="sidebar__footer">
					<a href="https://www.tldraw.com">
						<div
							className="sidebar__lockup"
							style={{
								mask: `url(/lockup.svg) center 100% / 100% no-repeat`,
								WebkitMask: `url(/lockup.svg) center 100% / 100% no-repeat`,
							}}
						/>
					</a>
					<div>tldraw © 2023</div>
				</div>
				<div className="sidebar__close">
					<span onClick={() => setMenuOpen(false)}>Close</span>
					<button className="icon-button" onClick={() => setMenuOpen(false)}>
						<Icon icon="close" />
					</button>
				</div>
			</div>
			{/* Menu */}
			<button className="menu__button icon-button" onClick={() => setMenuOpen(true)}>
				<Icon icon="menu" />
			</button>
		</>
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

function SidebarSection({ title, url, children }: SidebarContentSectionLink) {
	return (
		<li className="sidebar__section">
			{title && (
				<Link href={url}>
					<div className="sidebar__link sidebar__section__title" data-active={false}>
						{title}
					</div>
				</Link>
			)}
			<ul className="sidebar__list sidebar__section__list">
				{children.map((link) => (
					<SidebarLink key={link.url} {...link} />
				))}
			</ul>
		</li>
	)
}

function SidebarCategory({ title, url, children }: SidebarContentCategoryLink) {
	return (
		<li className="sidebar__category">
			<Link href={url}>
				<div className="sidebar__link sidebar__category__title" data-active={false}>
					{title}
				</div>
			</Link>
			<ul className="sidebar__list sidebar__category__list">
				{children.map((link) => (
					<SidebarLink key={link.url} {...link} />
				))}
			</ul>
			<hr />
		</li>
	)
}

function SidebarArticle({ title, url }: SidebarContentArticleLink) {
	return (
		<li className="sidebar__article">
			<Link href={url}>
				<div className="sidebar__link sidebar__article__title" data-active={false}>
					{title}
				</div>
			</Link>
		</li>
	)
}
