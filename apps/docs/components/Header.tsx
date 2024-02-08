'use client'

import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import Link from 'next/link'
import { Icon } from './Icon'
import { Chevron } from './Icons'
import { Search } from './Search'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Header({ sectionId }: { sectionId?: string }) {
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
			<Search />
			<div className="layout__header__sections_and_socials">
				<SectionLinks sectionId={sectionId} />
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

			<NavigationMenu.Root className="NavigationMenuRoot">
				<NavigationMenu.List className="NavigationMenuList">
					<NavigationMenu.Item>
						<NavigationMenu.Trigger
							className="NavigationMenuTrigger"
							onPointerMove={(event) => event.preventDefault()}
							onPointerLeave={(event) => event.preventDefault()}
						>
							<span>
								Community <Chevron className="CaretDown" aria-hidden />
							</span>
						</NavigationMenu.Trigger>
						<NavigationMenu.Content
							className="NavigationMenuContent"
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
