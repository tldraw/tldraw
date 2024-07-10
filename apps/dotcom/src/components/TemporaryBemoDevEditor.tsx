import { useMultiplayerDemo } from '@tldraw/sync-react'
import { Tldraw } from 'tldraw'
import { assetUrls } from '../utils/assetUrls'

export function TemporaryBemoDevEditor({ slug }: { slug: string }) {
	const store = useMultiplayerDemo({ host: 'http://127.0.0.1:8989', roomId: slug })

	return (
		<div className="tldraw__editor">
			<Tldraw store={store} assetUrls={assetUrls} inferDarkMode />
		</div>
	)
}
