'use client'

import Link from 'next/link'
import { Icon } from './Icon'
import { Search } from './Search'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Header({ sectionId }: { sectionId?: string }) {
	return (
		<div className="layout__header">
			<div className="layout__header__left">
				<Link href="/quick-start">
					<img className="logo-dark" src="/tldraw_dev_dark.png" />
					<img className="logo-light" src="/tldraw_dev_light.png" />
				</Link>
			</div>
			<Search />
			<div className="layout__header__links">
				<div className="layout__header__sections">
					<SectionLinks sectionId={sectionId} />
				</div>
				<div className="layout__header__socials">
					<a
						href="https://x.com/tldraw/"
						className="sidebar__button icon-button"
						title="twitter"
						target="_blank"
					>
						<Icon icon="twitter" />
					</a>
					<a
						href="https://discord.com/invite/SBBEVCA4PG"
						className="sidebar__button icon-button"
						title="discord"
						target="_blank"
					>
						<Icon icon="discord" />
					</a>
					<a
						href="https://github.com/tldraw/tldraw"
						className="sidebar__button icon-button"
						title="github"
						target="_blank"
					>
						<Icon icon="github" />
					</a>
					<ThemeSwitcher />
				</div>
			</div>
		</div>
	)
}

export function SectionLinks({ sectionId }: { sectionId?: string | null }) {
	return (
		<>
			<a
				href="/quick-start"
				title="Learn"
				data-active={!['reference', 'examples'].includes(sectionId || '')}
				className="layout_header__section"
			>
				Learn
			</a>
			<a
				href="/reference/editor/Editor"
				title="Reference"
				data-active={sectionId === 'reference'}
				className="layout_header__section"
			>
				Reference
			</a>
			<a
				href="/examples/basic/basic"
				title="Examples"
				data-active={sectionId === 'examples'}
				className="layout_header__section"
			>
				Examples
			</a>
		</>
	)
}
