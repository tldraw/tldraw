/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'

/** Shared header nav for the /dev/components/* inventory pages. */
export function DevComponentsNav(): ReactNode {
	const link = { color: 'var(--tl-color-primary)', textDecoration: 'none' } as const
	return (
		<nav
			style={{
				display: 'flex',
				gap: 16,
				marginBottom: 24,
				fontFamily: 'var(--tla-font-ui)',
				fontSize: 13,
			}}
		>
			<span style={{ color: 'var(--tl-color-text-3)' }}>dev / components:</span>
			<a href="/dev/components/buttons" style={link}>
				buttons
			</a>
			<a href="/dev/components/inputs" style={link}>
				inputs
			</a>
			<a href="/dev/components/typography" style={link}>
				typography
			</a>
			<a href="/dev/components/dialogs" style={link}>
				dialogs
			</a>
			<a href="/dev/components/menus" style={link}>
				menus
			</a>
		</nav>
	)
}
