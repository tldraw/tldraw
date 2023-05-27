import { DefaultErrorFallback, ErrorBoundary, Tldraw, hardReset } from '@tldraw/tldraw'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
/* eslint-disable import/no-internal-modules */
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import './index.css'

const assetUrls = getAssetUrlsByImport()

function Example() {
	const [instanceKey, setInstanceKey] = useState(0)

	useEffect(() => {
		;(window as any).hardReset = () => {
			hardReset({ shouldReload: false })
			setInstanceKey(instanceKey + 1)
		}
	}, [instanceKey])

	return (
		<div className="tldraw__editor">
			<Tldraw key={instanceKey} assetUrls={assetUrls} autoFocus />
		</div>
	)
}

const rootElement = document.getElementById('root')
const root = createRoot(rootElement!)

root.render(
	<StrictMode>
		<ErrorBoundary
			fallback={(error) => <DefaultErrorFallback error={error} />}
			onError={(error) => console.error(error)}
		>
			<Example />
		</ErrorBoundary>
	</StrictMode>
)
