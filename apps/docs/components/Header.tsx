import Link from 'next/link'
import { Icon } from './Icon'
import { Search } from './Search'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Header({
	activeId,
	searchQuery,
	searchType,
}: {
	activeId: string | null
	searchQuery?: string
	searchType?: string
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
			<Search activeId={activeId} prevQuery={searchQuery} prevType={searchType} />
			<div className="layout__header__socials">
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
				<ThemeSwitcher />
			</div>
		</div>
	)
}
