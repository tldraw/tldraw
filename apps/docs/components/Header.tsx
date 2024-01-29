import Link from 'next/link'
import { Icon } from './Icon'
import { Search } from './Search'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Header({
	searchQuery,
	searchType,
	sectionId,
}: {
	searchQuery?: string
	searchType?: string
	sectionId?: string
}) {
	return (
		<div className="layout__header">
			<Link href="/">
				<div
					className="lockup"
					style={{
						mask: `url(/lockup.svg) center 100% / 100% no-repeat`,
						WebkitMask: `url(/lockup.svg) center 100% / 100% no-repeat`,
					}}
				/>
			</Link>
			<Search prevQuery={searchQuery} prevType={searchType} />
			<div className="layout__header__sections_and_socials">
				<a
					href="/quick-start"
					title="Learn"
					data-active={sectionId === 'getting-started'}
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
					href="/examples/basic/develop"
					title="Examples"
					data-active={sectionId === 'examples'}
					className="layout_header__section"
				>
					Examples
				</a>
				<a
					href="/community"
					title="Community"
					data-active={sectionId === 'community'}
					className="layout_header__section"
				>
					Community
				</a>

				<ThemeSwitcher />
				<a
					href="https://discord.com/invite/SBBEVCA4PG"
					className="sidebar__button icon-button"
					title="discord"
				>
					<Icon icon="discord" />
				</a>
				<a
					href="https://github.com/tldraw/tldraw"
					className="sidebar__button icon-button"
					title="github"
				>
					<Icon icon="github" />
				</a>
			</div>
		</div>
	)
}
