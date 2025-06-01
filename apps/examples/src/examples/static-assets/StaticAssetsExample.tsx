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

/**
[1]
By default, the Tldraw component will pull in assets from tldraw's asset CDN.
You can override this behavior by providing your own asset URLs. These URLs can
be relative or absolute URLs.

In this case, we are using a relative URL to a custom arrow icon and a custom font. 
Because this is a Vite project, these files are stored in this project's public folder.
Check your framework documentation for how to serve static assets.

Important! This object needs to be created outside of a React component, or else 
memoized using a useMemo hook, otherwise it will cause the Tldraw component to
receive a new `asserUrls` object every time the component re-renders.

```tsx

export default function StaticAssetsExample() {
	const assetUrls = useMemo<TldrawProps['assetUrls']>(() => ({
		fonts: {
			tldraw_draw: '/ComicMono.woff',
		},
		icons: {
			'tool-arrow': '/custom-arrow-icon.svg',
		},
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="static-assets" assetUrls={assetUrls} />
		</div>
	)
}
```
*/
