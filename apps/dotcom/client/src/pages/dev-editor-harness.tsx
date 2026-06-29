/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { ContainerProvider, Tldraw, TldrawUiContextProvider } from 'tldraw'
import 'tldraw/tldraw.css'
import translationsEnJson from '../../public/tla/locales-compiled/en.json'
import { IntlProvider } from '../tla/utils/i18n'

/**
 * Shared harnesses for rendering otherwise-mocked dotcom components live in the
 * /dev/components gallery. A component is "mockable" because it needs host
 * context; these supply that context cheaply so the real component can render.
 *
 * The split mirrors the coupling itself: most components need only React
 * context (intl + the SDK UI providers + a container element for portals), which
 * IsolationProviders gives without an editor; a few are bound to the editor
 * runtime (useEditor / the menu schema) and need MinimalEditorHarness.
 */

const Providers = ({
	children,
	container,
}: {
	children: ReactNode
	container?: HTMLElement
}): ReactNode => {
	const ui = <TldrawUiContextProvider forceMobile={false}>{children}</TldrawUiContextProvider>
	return (
		<IntlProvider defaultLocale="en" locale="en" messages={translationsEnJson}>
			{container ? <ContainerProvider container={container}>{ui}</ContainerProvider> : ui}
		</IntlProvider>
	)
}

/**
 * Lightweight: dotcom react-intl (so useMsg works) + the SDK UI context (assets,
 * tooltips, SDK translations) + a container element (so useContainer resolves,
 * e.g. TlaMenuSelect). No editor. Use to wrap a whole page so its components
 * render live. document.body is a fine portal container for a dev page.
 */
export const IsolationProviders = ({ children }: { children: ReactNode }): ReactNode => (
	<Providers container={typeof document !== 'undefined' ? document.body : undefined}>
		{children}
	</Providers>
)

/**
 * Full: a minimal, empty, in-memory <Tldraw hideUi> supplying editor + container
 * context, for components truly bound to the editor runtime (the SDK
 * TldrawUiMenu* action-dropdown system). Heavier — mounts a real editor — so use
 * only when a component needs one. Fake content, real function.
 */
export const MinimalEditorHarness = ({
	children,
	height = 360,
	bare,
}: {
	children: ReactNode
	height?: number
	/** Fill the parent with no frame — for embedding inside a card's own stage. */
	bare?: boolean
}): ReactNode => (
	<div
		style={{
			position: 'relative',
			height,
			width: bare ? '100%' : undefined,
			maxWidth: bare ? undefined : 640,
			border: bare ? undefined : '1px solid var(--tl-color-divider)',
			borderRadius: bare ? undefined : 8,
			overflow: 'hidden',
		}}
	>
		<Tldraw hideUi>
			<Providers>{children}</Providers>
		</Tldraw>
	</div>
)
