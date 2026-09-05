// The design tokens for the button. Every visual decision the button makes is
// expressed as a CSS custom property, so a variant is just a set of token
// values, and a live edit is just an override of one of them.

export const BUTTON_VARIANT_IDS = ['primary', 'secondary', 'danger', 'ghost'] as const
export type ButtonVariant = (typeof BUTTON_VARIANT_IDS)[number]

export const BUTTON_TOKENS = [
	{ id: '--button-bg', label: 'Background', kind: 'color' },
	{ id: '--button-text', label: 'Text', kind: 'color' },
	{ id: '--button-border', label: 'Border', kind: 'color' },
	{ id: '--button-radius', label: 'Radius', kind: 'text' },
	{ id: '--button-padding', label: 'Padding', kind: 'text' },
	{ id: '--button-font-size', label: 'Font size', kind: 'text' },
	{ id: '--button-shadow', label: 'Shadow', kind: 'text' },
] as const
export type ButtonTokenId = (typeof BUTTON_TOKENS)[number]['id']

export const BUTTON_VARIANTS: Record<ButtonVariant, Record<ButtonTokenId, string>> = {
	primary: {
		'--button-bg': '#3b82f6',
		'--button-text': '#ffffff',
		'--button-border': 'transparent',
		'--button-radius': '8px',
		'--button-padding': '10px 20px',
		'--button-font-size': '14px',
		'--button-shadow': '0 1px 2px rgba(0, 0, 0, 0.15)',
	},
	secondary: {
		'--button-bg': '#ffffff',
		'--button-text': '#1f2937',
		'--button-border': '#d1d5db',
		'--button-radius': '8px',
		'--button-padding': '10px 20px',
		'--button-font-size': '14px',
		'--button-shadow': '0 1px 2px rgba(0, 0, 0, 0.06)',
	},
	danger: {
		'--button-bg': '#ef4444',
		'--button-text': '#ffffff',
		'--button-border': 'transparent',
		'--button-radius': '8px',
		'--button-padding': '10px 20px',
		'--button-font-size': '14px',
		'--button-shadow': '0 1px 2px rgba(0, 0, 0, 0.15)',
	},
	ghost: {
		'--button-bg': 'transparent',
		'--button-text': '#3b82f6',
		'--button-border': 'transparent',
		'--button-radius': '8px',
		'--button-padding': '10px 20px',
		'--button-font-size': '14px',
		'--button-shadow': 'none',
	},
}

// The button component's stylesheet. It refers to nothing but tokens, and it
// lives in the theme atom (see buttonTheme.ts), so it can be edited at
// runtime — the portal in each frame re-renders the <style> element and every
// visible button updates without a reload.
export const DEFAULT_BUTTON_CSS = `.lab-button {
	background: var(--button-bg);
	color: var(--button-text);
	border: 1px solid var(--button-border);
	border-radius: var(--button-radius);
	padding: var(--button-padding);
	font-size: var(--button-font-size);
	box-shadow: var(--button-shadow);
	font-family: system-ui, sans-serif;
	font-weight: 500;
	cursor: pointer;
}
.lab-button:hover {
	filter: brightness(0.94);
}
.lab-button:active {
	transform: translateY(1px);
}`

// The static document each iframe loads via srcDoc. It only contains the
// frame chrome — the button's own stylesheet and markup are portaled in by
// React, so nothing here ever needs to reload.
export const FRAME_HTML = `<!doctype html>
<html>
	<head>
		<style>
			html,
			body {
				margin: 0;
				height: 100%;
			}
			.frame-root {
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				background: #ffffff;
			}
		</style>
	</head>
	<body></body>
</html>`
