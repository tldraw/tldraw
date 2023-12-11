import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { setDefaultEditorAssetUrls, setDefaultUiAssetUrls } from '@tldraw/tldraw'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ExamplesApp } from './ExamplesApp'

// we use secret internal `setDefaultAssetUrls` functions to set these at the
// top-level so assets don't need to be passed down in every single example.
const assetUrls = getAssetUrlsByMetaUrl()
setDefaultEditorAssetUrls(assetUrls)
setDefaultUiAssetUrls(assetUrls)

document.addEventListener('DOMContentLoaded', () => {
	const rootElement = document.getElementById('root')!
	const root = createRoot(rootElement!)
	root.render(
		<StrictMode>
			<ExamplesApp />
		</StrictMode>
	)
})
