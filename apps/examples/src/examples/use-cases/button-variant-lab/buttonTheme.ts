import { atom } from 'tldraw'
import { BUTTON_VARIANTS, ButtonTokenId, ButtonVariant, DEFAULT_BUTTON_CSS } from './buttonTokens'

export interface ButtonTheme {
	variants: Record<ButtonVariant, Record<ButtonTokenId, string>>
	css: string
}

// The single source of truth for the component's design: each variant's token
// values plus the button's stylesheet. It's a tldraw atom, so every component
// that reads it with useValue — including the shape components rendering into
// their iframes — re-renders the moment any part of it changes. Editing a
// variant token here restyles every visible frame of that variant at once;
// per-shape overrides still shadow it.
//
// This state lives outside the store, so it isn't undoable, persisted, or
// synced. It's also module-level, which makes it a process-wide singleton:
// the example calls resetButtonTheme on mount so a remount starts clean.
export const buttonTheme = atom<ButtonTheme>('button theme', {
	variants: BUTTON_VARIANTS,
	css: DEFAULT_BUTTON_CSS,
})

export function resetButtonTheme() {
	buttonTheme.set({ variants: BUTTON_VARIANTS, css: DEFAULT_BUTTON_CSS })
}

export function setVariantToken(variant: ButtonVariant, tokenId: ButtonTokenId, value: string) {
	buttonTheme.update((theme) => ({
		...theme,
		variants: {
			...theme.variants,
			[variant]: { ...theme.variants[variant], [tokenId]: value },
		},
	}))
}

export function resetVariantToken(variant: ButtonVariant, tokenId: ButtonTokenId) {
	setVariantToken(variant, tokenId, BUTTON_VARIANTS[variant][tokenId])
}

export function setButtonCss(css: string) {
	buttonTheme.update((theme) => ({ ...theme, css }))
}

export function resetButtonCss() {
	setButtonCss(DEFAULT_BUTTON_CSS)
}
