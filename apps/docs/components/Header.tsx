'use client'

import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import Link from 'next/link'
import { Icon } from './Icon'
import { Chevron } from './Icons'
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
			<Link href="/quick-start">
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
				<SectionLinks sectionId={sectionId} />
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
				href="/examples/basic/develop"
				title="Examples"
				data-active={sectionId === 'examples'}
				className="layout_header__section"
			>
				Examples
			</a>

			<NavigationMenu.Root className="navigation-menu__root">
				<NavigationMenu.List className="navigation-menu__list">
					<NavigationMenu.Item>
						<NavigationMenu.Trigger
							className="navigation-menu__trigger"
							onPointerMove={(event) => event.preventDefault()}
							onPointerLeave={(event) => event.preventDefault()}
						>
							<span>
								Community <Chevron className="navigation-menu__chevron" aria-hidden />
							</span>
						</NavigationMenu.Trigger>
						<NavigationMenu.Content
							className="navigation-menu__content"
							onPointerMove={(event) => event.preventDefault()}
							onPointerLeave={(event) => event.preventDefault()}
						>
							<ul>
								<li>
									<NavigationMenu.Link asChild>
										<a href="/community/contributing">Contributing</a>
									</NavigationMenu.Link>
								</li>
								<li>
									<NavigationMenu.Link asChild>
										<a href="/community/translations">Translations</a>
									</NavigationMenu.Link>
								</li>
								<li>
									<NavigationMenu.Link asChild>
										<a href="/community/license">License</a>
									</NavigationMenu.Link>
								</li>
								<li>
									<NavigationMenu.Link asChild>
										<a href="https://discord.com/invite/SBBEVCA4PG" target="_blank">
											Discord
										</a>
									</NavigationMenu.Link>
								</li>
							</ul>
						</NavigationMenu.Content>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>
		</>
	)
}
