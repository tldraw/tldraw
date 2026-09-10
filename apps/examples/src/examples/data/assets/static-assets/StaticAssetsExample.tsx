import { Tldraw, TldrawProps } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const assetUrls: TldrawProps['assetUrls'] = {
	fonts: {
		tldraw_draw: '/ComicMono.woff',
	},
	icons: {
		'tool-arrow': '/custom-arrow-icon.svg',
	},
}

export default function StaticAssetsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="static-assets" assetUrls={assetUrls} />
		</div>
	)
}

/*
[1]
By default the `Tldraw` component loads its fonts, icons, and translations from tldraw's
asset CDN. `assetUrls` overrides individual URLs; anything you don't list keeps its
default. Both relative and absolute URLs work.

Here the "draw" font and the arrow tool icon are replaced with files served from this
Vite project's public folder. Check your framework's docs for how it serves static files.

Define this object outside the component (or memoize it with `useMemo`). A fresh object
on every render would make `Tldraw` re-resolve its assets each time.
*/
