import { useMultiplayerSync } from '@tldraw/sync'
import { TLAssetStore, Tldraw, uniqueId } from 'tldraw'

const WORKER_URL = 'http://localhost:5172'
const roomId = 'test-room'

function App() {
	const store = useMultiplayerSync({
		uri: `${WORKER_URL}/connect/${roomId}`,
		assets: multiplayerAssets,
	})

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw store={store} />
		</div>
	)
}

const multiplayerAssets: Partial<TLAssetStore> = {
	async upload(_asset, file) {
		const id = uniqueId()

		const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, '-')
		const url = `${WORKER_URL}/uploads/${objectName}`

		const response = await fetch(url, {
			method: 'POST',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return url
	},
}

export default App
