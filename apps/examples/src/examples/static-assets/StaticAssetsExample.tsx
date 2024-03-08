import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function StaticAssetsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="static-assets"
				assetUrls={{
					fonts: {
						// [1]
						draw: '/ComicMono.woff',
					},
					icons: {
						'tool-arrow': '/custom-arrow-icon.svg',
					},
				}}
			/>
		</div>
	)
}

/**
These assets are stored in the /public folder of this Vite project, but this could be any URL.
By default, the Tldraw component will pull in assets from the @tldraw/assets package on Unpkg.
*/
