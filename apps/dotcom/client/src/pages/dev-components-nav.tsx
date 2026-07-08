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
			<a href="/dev/components/icons" style={link}>
				icons
			</a>
			<a href="/dev/components/links" style={link}>
				links
			</a>
			<a href="/dev/components/overlays" style={link}>
				overlays
			</a>
			<a href="/dev/components/form-controls" style={link}>
				form controls
			</a>
			<a href="/dev/components/presence" style={link}>
				presence
			</a>
			<a href="/dev/components/logo" style={link}>
				logo
			</a>
			<a href="/dev/components/states" style={link}>
				states
			</a>
			<a href="/dev/components/sidebar" style={link}>
				sidebar map
			</a>
			<a href="/dev/components/editor" style={link}>
				editor map
			</a>
			<a href="/dev/components/timestamps" style={link}>
				dates
			</a>
			<a href="/dev/components/identity" style={link}>
				identity
			</a>
		</nav>
	)
}
