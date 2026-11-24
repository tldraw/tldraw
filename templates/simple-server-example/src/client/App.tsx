import { useSync } from '@tldraw/sync'
import { useEffect, useMemo, useState } from 'react'
import {
	AssetRecordType,
	getHashForString,
	TLAssetStore,
	TLBookmarkAsset,
	Tldraw,
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
	uniqueId,
	useEditor,
} from 'tldraw'

const WORKER_URL = `http://localhost:5858`

// In this example, the room ID is hard-coded. You can set this however you like though.
const roomId = 'test-room'

// The server reads the user from the connect URL. See src/server/permissions.ts. In a real app,
// the server gets the user from your auth instead.
const USERS = ['teacher', 'sam', 'alex']

function App() {
	const [user, setUser] = useState(USERS[0])
	// A new user needs a new connection, so we remount the editor.
	return <Room key={user} user={user} setUser={setUser} />
}

function Room({ user, setUser }: { user: string; setUser(user: string): void }) {
	// Create a store connected to multiplayer.
	const store = useSync({
		// We need to know the websocket's URI...
		uri: `${WORKER_URL}/connect/${roomId}?user=${encodeURIComponent(user)}`,
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssets,
	})
	const components = useMemo(
		() => ({ TopPanel: () => <Controls user={user} setUser={setUser} /> }),
		[user, setUser]
	)

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				// we can pass the connected store into the Tldraw component which will handle
				// loading states & enable multiplayer UX like cursors & a presence menu
				store={store}
				onMount={(editor) => {
					// @ts-expect-error
					window.editor = editor
					// when the editor is ready, we need to register out bookmark unfurling service
					editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
				}}
				components={components}
			/>
		</div>
	)
}

function Controls({ user, setUser }: { user: string; setUser(user: string): void }) {
	const editor = useEditor()
	const [status, setStatus] = useState('Your changes sync to the server')

	// The server reverts a change that its checkDiff rejects, and tells us why.
	useEffect(() => {
		function onRejected({ reason }: { reason: string }) {
			setStatus(`Rejected: ${reason}`)
		}
		editor.on('rejected', onRejected)
		return () => {
			editor.off('rejected', onRejected)
		}
	}, [editor])

	return (
		<div className="permissions-controls">
			<div className="tlui-menu permissions-user">
				<span>Act as</span>
				<TldrawUiSelect id="act-as" value={user} onValueChange={setUser}>
					<TldrawUiSelectTrigger>
						<TldrawUiSelectValue placeholder="User">{user}</TldrawUiSelectValue>
					</TldrawUiSelectTrigger>
					<TldrawUiSelectContent>
						{USERS.map((name) => (
							<TldrawUiSelectItem key={name} value={name} label={name} />
						))}
					</TldrawUiSelectContent>
				</TldrawUiSelect>
			</div>
			<div className="tlui-menu permissions-status" title={status}>
				{status}
			</div>
		</div>
	)
}

// How does our server handle assets like images and videos?
const multiplayerAssets: TLAssetStore = {
	// to upload an asset, we prefix it with a unique id, POST it to our worker, and return the URL
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
	// to retrieve an asset, we can just use the same URL. you could customize this to add extra
	// auth, or to serve optimized versions / sizes of the asset.
	resolve(asset) {
		return asset.props.src
	},
}

// How does our server handle bookmark unfurling?
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
