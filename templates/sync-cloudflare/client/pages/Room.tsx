import { useSync } from '@tldraw/sync'
import { useParams } from 'react-router-dom'
import { Tldraw } from 'tldraw'
import { getBookmarkPreview } from '../getBookmarkPreview'
import { multiplayerAssetStore } from '../multiplayerAssetStore'

export function Room() {
	const { roomId } = useParams<{ roomId: string }>()

	// Create a store connected to multiplayer.
	const store = useSync({
		// We need to know the websockets URI...
		uri: `${window.location.origin}/api/connect/${roomId}`,
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssetStore,
	})

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				// we can pass the connected store into the Tldraw component which will handle
				// loading states & enable multiplayer UX like cursors & a presence menu
				store={store}
				deepLinks
				onMount={(editor) => {
					// when the editor is ready, we need to register our bookmark unfurling service
					editor.registerExternalAssetHandler('url', getBookmarkPreview)
				}}
			/>
		</div>
	)
}
