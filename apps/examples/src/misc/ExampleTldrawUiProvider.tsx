import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { TldrawUiProvider } from '@tldraw/ui'
import '@tldraw/ui/ui.css'
import { ReactNode } from 'react'
import { useMaybeEditor, useValue } from 'tldraw'

const assetUrls = getAssetUrlsByMetaUrl()

/**
 * Wraps example UI built with `@tldraw/ui` components. Provides the SDK icon
 * set and keeps the theme in sync with the editor's dark mode when rendered
 * inside a `Tldraw` component. Portals (menus, dialogs, toasts) mount inside
 * the provider's own `.tl-ui` element, so place this outside any container
 * with `overflow: hidden` when using popovers or dropdowns.
 */
export function ExampleTldrawUiProvider({ children }: { children: ReactNode }) {
	const editor = useMaybeEditor()
	const isDarkMode = useValue('isDarkMode', () => editor?.user.getIsDarkMode() ?? false, [editor])

	return (
		<TldrawUiProvider theme={isDarkMode ? 'dark' : 'light'} iconAssetUrls={assetUrls.icons}>
			{children}
		</TldrawUiProvider>
	)
}
