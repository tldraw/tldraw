import { hardReset, Tldraw } from '@tldraw/tldraw'
/* eslint-disable import/no-internal-modules */
import { getAssetUrlsByImport } from '@tldraw/assets/imports'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
/* eslint-enable import/no-internal-modules */

import { useEffect, useState } from 'react'

declare global {
	interface Window {
		webdriverReset: () => void
	}
}

const assetUrls = getAssetUrlsByImport()

// NOTE: This is currently very similar to `apps/examples/src/1-basic/BasicExample.tsx`
// and should probably stay that way to make writing new tests easier as it's
// what we're most familiar with
export default function Example() {
	const [instanceKey, setInstanceKey] = useState(0)

	useEffect(() => {
		window.webdriverReset = () => {
			hardReset({ shouldReload: false })
			setInstanceKey(instanceKey + 1)
		}
	}, [instanceKey])

	return (
		<div className="tldraw__editor">
			<Tldraw key={instanceKey} autoFocus assetUrls={assetUrls} />
		</div>
	)
}
