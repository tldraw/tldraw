import { useEffect, useRef, useState } from 'react'
import { useValue } from 'tldraw'
import { apps } from './apps'
import { focusedIdAtom, windowsAtom } from './WindowManager'

// Mirrors the marketing top nav on tldraw.dev. The four dropdown menus
// match the "Product / Solutions / Developers / Resources" set on the
// homepage; the flat right-side links match what's pinned next to them
// ("Pricing / Showcase / Blog / Docs"); and the brand socials sit at
// the far right.
//
// Each entry is opened in a new tab — the menu bar is presentational
// chrome, not a router, and we don't want to lose the desktop state by
// navigating away.

interface MenuLink {
	label: string
	href: string
	description?: string
}
interface Menu {
	label: string
	items: ReadonlyArray<MenuLink>
}

const LOGO_HREF = 'https://tldraw.dev/'

const DROPDOWNS: ReadonlyArray<Menu> = [
	{
		label: 'Product',
		items: [
			{
				label: 'Out-of-the-box whiteboard',
				href: 'https://tldraw.dev/features/out-of-the-box-whiteboard',
				description: 'A full whiteboard SDK, drop-in ready.',
			},
			{
				label: 'Multiplayer collaboration',
				href: 'https://tldraw.dev/features/composable-primitives/multiplayer-collaboration',
				description: 'Realtime sync with Cloudflare Durable Objects.',
			},
			{
				label: 'Selection & transformation',
				href: 'https://tldraw.dev/features/composable-primitives/selection-and-transformation',
			},
			{
				label: 'Accessibility',
				href: 'https://tldraw.dev/features/composable-primitives/accessibility',
			},
			{
				label: 'Data management',
				href: 'https://tldraw.dev/features/composable-primitives/data-management',
			},
			{
				label: 'Layout & composition',
				href: 'https://tldraw.dev/features/composable-primitives/layout-and-composition',
			},
			{
				label: 'Custom styles & themes',
				href: 'https://tldraw.dev/features/customization/custom-styles-and-themes',
			},
		],
	},
	{
		label: 'Solutions',
		items: [
			{
				label: 'ClickUp',
				href: 'https://tldraw.dev/blog/clickup',
				description: 'A modern whiteboard inside the productivity suite.',
			},
			{
				label: 'Padlet',
				href: 'https://tldraw.dev/blog/padlet',
				description: 'Visual collaboration for classrooms.',
			},
			{
				label: 'Mobbin',
				href: 'https://tldraw.dev/blog/mobbin',
				description: 'Annotated UX research collections.',
			},
			{
				label: 'Jam',
				href: 'https://tldraw.dev/blog/jam',
				description: 'Async screen sharing and feedback.',
			},
			{ label: 'See all in Showcase', href: 'https://tldraw.dev/showcase' },
		],
	},
	{
		label: 'Developers',
		items: [
			{ label: 'Quick Start', href: 'https://tldraw.dev/quick-start' },
			{ label: 'Docs', href: 'https://tldraw.dev/docs' },
			{ label: 'Examples', href: 'https://tldraw.dev/examples/basic' },
			{ label: 'Starter kits', href: 'https://tldraw.dev/starter-kits/overview' },
			{ label: 'API Reference', href: 'https://tldraw.dev/reference' },
			{ label: 'Releases', href: 'https://tldraw.dev/releases' },
		],
	},
	{
		label: 'Resources',
		items: [
			{ label: 'Blog', href: 'https://tldraw.dev/blog' },
			{ label: 'Showcase', href: 'https://tldraw.dev/showcase' },
			{ label: 'FAQ', href: 'https://tldraw.dev/faq' },
			{ label: 'Careers', href: 'https://tldraw.dev/careers' },
			{ label: 'Videos & events', href: 'https://tldraw.dev/blog/events' },
			{ label: 'Community license', href: 'https://tldraw.dev/community/license' },
			{ label: 'Trademark guidelines', href: 'https://tldraw.dev/legal/trademark-guidelines' },
			{
				label: 'Contributor License Agreement',
				href: 'https://tldraw.dev/legal/contributor-license-agreement',
			},
		],
	},
]

const RIGHT_LINKS: ReadonlyArray<MenuLink> = [
	{ label: 'Pricing', href: 'https://tldraw.dev/pricing' },
	{ label: 'Showcase', href: 'https://tldraw.dev/showcase' },
	{ label: 'Blog', href: 'https://tldraw.dev/blog' },
	{ label: 'Docs', href: 'https://tldraw.dev/quick-start' },
]

const SOCIAL_LINKS: ReadonlyArray<MenuLink> = [
	{ label: 'GitHub', href: 'https://github.com/tldraw/tldraw' },
	{
		label: 'Discord',
		href: 'https://discord.tldraw.com/?utm_source=desktop&utm_medium=tldraw-os',
	},
	{ label: 'Twitter', href: 'https://x.com/tldraw/' },
]

const LOGO_ALT = 'tldraw'

export function DesktopMenuBar() {
	const [openIndex, setOpenIndex] = useState<number | null>(null)
	const barRef = useRef<HTMLDivElement | null>(null)

	// macOS-style: the explicitly-focused window owns the menu bar.
	// Clicking the desktop canvas clears focus and the marketing menu
	// comes back. Closing or minimizing the focused window also clears
	// focus (handled in WindowManager).
	const focused = useValue(
		'focused-window',
		() => {
			const id = focusedIdAtom.get()
			if (!id) return null
			const win = windowsAtom.get().find((w) => w.id === id && !w.minimized)
			return win ? { appId: win.appId, app: apps[win.appId] } : null
		},
		[]
	)

	useEffect(() => {
		if (openIndex === null) return
		const onPointerDown = (e: PointerEvent) => {
			if (!barRef.current) return
			if (!barRef.current.contains(e.target as Node)) setOpenIndex(null)
		}
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpenIndex(null)
		}
		window.addEventListener('pointerdown', onPointerDown)
		window.addEventListener('keydown', onKeyDown)
		return () => {
			window.removeEventListener('pointerdown', onPointerDown)
			window.removeEventListener('keydown', onKeyDown)
		}
	}, [openIndex])

	// Close any open dropdown when an app takes focus — the menu's gone.
	useEffect(() => {
		if (focused && openIndex !== null) setOpenIndex(null)
	}, [focused, openIndex])

	if (focused) {
		// For the canonical tldraw app, skip the title — the logo is
		// enough, and the title would just say "tldraw" right next to it.
		const showTitle = focused.appId !== 'tldraw'
		return (
			<div ref={barRef} className="desktop__menubar" role="menubar" aria-label={focused.app.title}>
				<a
					className="desktop__menubar-logo"
					href={LOGO_HREF}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={LOGO_ALT}
					title={LOGO_ALT}
				>
					<img className="desktop__menubar-logo-img" src="/tla/tldraw-logo-2.svg" alt={LOGO_ALT} />
				</a>
				{showTitle && <div className="desktop__menubar-active-title">{focused.app.title}</div>}
			</div>
		)
	}

	return (
		<div ref={barRef} className="desktop__menubar" role="menubar" aria-label="tldraw.dev">
			<a
				className="desktop__menubar-logo"
				href={LOGO_HREF}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={LOGO_ALT}
				title={LOGO_ALT}
			>
				<img className="desktop__menubar-logo-img" src="/tla/tldraw-logo-2.svg" alt={LOGO_ALT} />
			</a>
			<ul className="desktop__menubar-items">
				{DROPDOWNS.map((menu, i) => {
					const isOpen = openIndex === i
					return (
						<li key={menu.label} className="desktop__menubar-item">
							<button
								type="button"
								className="desktop__menubar-link desktop__menubar-trigger hoverable"
								data-open={isOpen || undefined}
								aria-haspopup="menu"
								aria-expanded={isOpen}
								onClick={() => setOpenIndex(isOpen ? null : i)}
							>
								{menu.label}
								<svg className="desktop__menubar-caret" viewBox="0 0 10 6" aria-hidden="true">
									<path
										d="M1 1L5 5L9 1"
										stroke="currentColor"
										strokeWidth="1.4"
										fill="none"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
							{isOpen && <MenuDropdown menu={menu} onClose={() => setOpenIndex(null)} />}
						</li>
					)
				})}
				{RIGHT_LINKS.map((link) => (
					<li key={link.href} className="desktop__menubar-item">
						<a
							className="desktop__menubar-link hoverable"
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
						>
							{link.label}
						</a>
					</li>
				))}
			</ul>
			<ul className="desktop__menubar-socials">
				{SOCIAL_LINKS.map((s) => (
					<li key={s.href} className="desktop__menubar-item">
						<a
							className="desktop__menubar-link hoverable"
							href={s.href}
							target="_blank"
							rel="noopener noreferrer"
						>
							{s.label}
						</a>
					</li>
				))}
			</ul>
		</div>
	)
}

function MenuDropdown({ menu, onClose }: { menu: Menu; onClose(): void }) {
	return (
		<div className="desktop__menubar-dropdown" role="menu" aria-label={menu.label}>
			{menu.items.map((item) => (
				<a
					key={item.href}
					className="desktop__menubar-dropdown-item hoverable"
					href={item.href}
					target="_blank"
					rel="noopener noreferrer"
					role="menuitem"
					onClick={onClose}
				>
					<span className="desktop__menubar-dropdown-label">{item.label}</span>
					{item.description && (
						<span className="desktop__menubar-dropdown-desc">{item.description}</span>
					)}
				</a>
			))}
		</div>
	)
}
