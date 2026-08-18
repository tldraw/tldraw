import { useSync } from '@tldraw/sync'
import {
	AssetRecordType,
	getHashForString,
	TLAssetStore,
	TLBookmarkAsset,
	Tldraw,
	uniqueId,
} from 'tldraw'

const WORKER_URL = `http://localhost:5858`

// In this example, the room ID is hard-coded. You can set this however you like though.
const roomId = 'test-room'

function App() {
	const store = useSync({
		uri: `${WORKER_URL}/connect/${roomId}`,
		assets: multiplayerAssets,
	})

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				// the synced store handles loading states & enables multiplayer UX like cursors & presence
				store={store}
				onMount={(editor) => {
					// @ts-expect-error
					window.editor = editor
					editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
				}}
			/>
		</div>
	)
}

// Assets like images and videos are PUT to the server under a unique name.
const multiplayerAssets: TLAssetStore = {
	async upload(_asset, file) {
		const objectName = `${uniqueId()}-${file.name}`
		const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`

		const response = await fetch(url, {
			method: 'PUT',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return { src: url }
	},
	// the same URL serves the asset. you could customize this to add extra auth, or to serve
	// optimized versions / sizes of the asset.
	resolve(asset) {
		return asset.props.src
	},
}

// Bookmark unfurling: ask the server for the URL's metadata and fill in an asset record.
async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
	const asset: TLBookmarkAsset = {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		meta: {},
		props: {
			src: url,
			description: '',
			image: '',
			favicon: '',
			title: '',
		},
	}

	try {
		const response = await fetch(`${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`)
		const data = await response.json()

		asset.props.description = data?.description ?? ''
		asset.props.image = data?.image ?? ''
		asset.props.favicon = data?.favicon ?? ''
		asset.props.title = data?.title ?? ''
	} catch (e) {
		console.error(e)
	}

	return asset
}

export default App
