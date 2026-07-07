import { ReactNode, useEffect, useState } from 'react'
import { Editor, Tldraw, TldrawUiContextProvider, TldrawUiTranslationProvider } from 'tldraw'
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
export function IsolatedHarness({
	env,
	children,
	fill,
}: {
	env: Env
	children: ReactNode
	/** Fill the frame instead of centering — for viewport scenes whose root is 100% high. */
	fill?: boolean
}) {
	return (
		<div
			className={`isolated-harness${fill ? ' isolated-harness--fill' : ''} tl-container tl-theme__${env.theme}`}
			data-color-mode={env.theme}
		>
			<TldrawUiContextProvider>
				<TldrawUiTranslationProvider locale={env.locale}>{children}</TldrawUiTranslationProvider>
			</TldrawUiContextProvider>
		</div>
	)
}

/**
 * Wraps a sketch in a live `<Tldraw hideUi>` editor, for canvas-bound components
 * (comment pins, overlays) that need `useEditor`. The editor supplies its own theme
 * and i18n context, so the globals are applied through user preferences rather than
 * CSS classes — `<Tldraw>` drives the container's theme classes off editor state.
 */
export function EditorHarness({ env, children }: { env: Env; children: ReactNode }) {
	const [editor, setEditor] = useState<Editor | null>(null)

	useEffect(() => {
		if (editor) {
			editor.user.updateUserPreferences({ colorScheme: env.theme, locale: env.locale })
		}
	}, [editor, env.theme, env.locale])

	return (
		<div className="editor-harness">
			<Tldraw hideUi onMount={setEditor}>
				{children}
			</Tldraw>
		</div>
	)
}
