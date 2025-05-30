import { Tldraw } from 'tldraw'
import { useMemo } from 'react'
import 'tldraw/tldraw.css'

export default function StaticAssetsExample() {
	const assetUrls = useMemo(() => ({
        	fonts: {
			// [1]
			tldraw_draw: '/ComicMono.woff',
		},
		icons: {
			'tool-arrow': '/custom-arrow-icon.svg',
		},
    	}), [])
	
	
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="static-assets"
				assetUrls={assetUrls}
			/>
		</div>
	)
}

/**
These assets are stored in the /public folder of this Vite project, but this could be any URL.
By default, the Tldraw component will pull in assets from tldraw's asset CDN.
*/
