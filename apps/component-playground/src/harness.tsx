import { ReactNode } from 'react'
import { TldrawUiContextProvider, TldrawUiTranslationProvider } from 'tldraw'
import { Env } from './channel'

/**
 * Wraps a sketch in the SDK UI context so components that use theme, i18n, assets,
 * or portals render correctly outside a full editor.
 *
 * Theme is applied as container classes — tldraw derives its tokens purely from CSS
 * (`.tl-container` for spacing/radius, `.tl-theme__{light,dark}` for colors), no
 * provider needed. Locale is set by nesting a TldrawUiTranslationProvider inside the
 * context provider: the outer provider supplies the AssetUrlsProvider that
 * translations require, and the inner one overrides the locale — the context provider
 * alone locks to 'en' when there is no editor to read a locale from.
 */
export function IsolatedHarness({ env, children }: { env: Env; children: ReactNode }) {
	return (
		<div
			className={`isolated-harness tl-container tl-theme__${env.theme}`}
			data-color-mode={env.theme}
		>
			<TldrawUiContextProvider>
				<TldrawUiTranslationProvider locale={env.locale}>{children}</TldrawUiTranslationProvider>
			</TldrawUiContextProvider>
		</div>
	)
}
