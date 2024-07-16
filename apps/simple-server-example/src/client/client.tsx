import { useMultiplayerSync } from '@tldraw/sync'
import { useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import {
	Route,
	RouterProvider,
	createBrowserRouter,
	createRoutesFromElements,
	useParams,
} from 'react-router-dom'
import { AssetRecordType, Editor, TLAsset, TLAssetStore, Tldraw, getHashForString } from 'tldraw'
import 'tldraw/tldraw.css'

const assets: TLAssetStore = {
	resolve: async (asset) => {
		return asset.props.src
	},
	upload: async (asset, file) => {
		const url = `http://localhost:5858/assets/${encodeURIComponent(asset.id)}`
		const res = await fetch(url, { method: 'PUT', body: file })
		if (!res.ok) {
			throw new Error('Failed to upload asset')
		}
		return url
	},
}

export async function unfurl({ url }: { url: string }): Promise<TLAsset> {
	const urlHash = getHashForString(url)
	let meta: { description: string; image: string; favicon: string; title: string } | undefined
	try {
		meta = (await (
			await fetch(`http://localhost:5858/unfurl?url=${encodeURIComponent(url)}`)
		).json()) as any
	} catch (e) {
		console.error(e)
	}

	return {
		id: AssetRecordType.createId(urlHash),
		typeName: 'asset',
		type: 'bookmark',
		props: {
			src: url,
			description: meta?.description ?? '',
			image: meta?.image ?? '',
			favicon: meta?.favicon ?? '',
			title: meta?.title ?? '',
		},
		meta: {},
	}
}

function App() {
	const { roomId } = useParams()
	const store = useMultiplayerSync({
		uri: 'ws://localhost:5858/connect/' + roomId,
		assets,
		onEditorMount: useCallback((editor: Editor) => {
			editor.registerExternalAssetHandler('url', unfurl)
		}, []),
	})
	return <Tldraw store={store} />
}

createRoot(document.getElementById('root')!).render(
	<RouterProvider
		router={createBrowserRouter(
			createRoutesFromElements(
				<>
					<Route path="/:roomId" Component={() => <App />} />
					<Route
						path="/"
						Component={() => {
							return (
								<div style={{ padding: 20 }}>
									<h1>TLDraw</h1>
									<p>
										Open a room by going to <code>/:roomId</code>
									</p>
									<p>
										e.g. <a href="/hello_world">{location.host}/hello_world</a>
									</p>
								</div>
							)
						}}
					/>
				</>
			)
		)}
	/>
)
