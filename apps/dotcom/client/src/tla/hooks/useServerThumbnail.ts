import { useEffect, useState } from 'react'
import {
	SerializedSchemaV2,
	TLRecord,
	TLStoreSnapshot,
	fetch,
	getHashForObject,
	useValue,
} from 'tldraw'
import {
	loadDataFromStore,
	loadThumbnailFromStore,
	storeThumbnailInIndexedDb,
} from '../utils/local-sync'
import { useApp } from './useAppState'

export function useServerThumbnail(id: string) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])

	const [state, setState] = useState<'loading' | 'error' | 'loaded'>('loading')
	const [imageUrl, setImageUrl] = useState<string | null>(null)

	useEffect(() => {
		let didDispose = false
		let didReturnRemote = false

		// Start loading the local thumbnail for this file
		loadThumbnailFromStore({
			fileId: id,
			didCancel: () => didDispose,
		}).then(async (localData) => {
			// If we have a local thumbnail, set it but don't set the state as loaded
			if (localData && localData.thumbnail) {
				// Skip if we've already returned a remote thumbnail
				if (didReturnRemote) return
				setImageUrl(`data:image/png;base64,${localData.thumbnail}`)
			}

			// Next, load the snapshot from the local store for this file and check its hash
			loadDataFromStore({
				storePrefix: 'TLDRAW_DOCUMENT_v2',
				indexKey: 'TLDRAW_DB_NAME_INDEX_v2',
				persistenceKey: `tla-2_${id}`,
				didCancel: () => didDispose,
			}).then(async (data) => {
				if (!data) return

				const snapshot = {
					store: Object.fromEntries((data.records as TLRecord[]).map((r) => [r.id, r])),
					schema: data.schema as SerializedSchemaV2,
				} satisfies TLStoreSnapshot

				const hash = getHashForObject(snapshot)

				// If the hash matches our local data hash, we can skip the server request
				if (localData && localData.hash === hash) {
					setState('loaded')
					return
				}

				// Otherwise, send the file id and the hash to the server.
				// The server might have a thumbnail for that hash, in which
				// case we'll get it back quickly; or it might not, in which
				// case the server will queue up a request for a screenshot
				// and send it back.
				//
				// Note that for this prototype, we also send the snapshot to
				// the server (since we're not using a real database) but in
				// production the server would be able to access the file data
				// from the database using the fileId.
				const result = await fetch(`http://localhost:5002/thumbnail`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ id, snapshot, hash }),
				}).then((res) => res.json())

				if (result.screenshot) {
					didReturnRemote = true

					// Set the image URL
					setImageUrl(`data:image/png;base64,${result.screenshot}`)

					// Update the state
					setState('loaded')

					// Set the thumbnail in storage
					storeThumbnailInIndexedDb({
						fileId: id,
						hash,
						thumbnail: result.screenshot,
						didCancel: () => didDispose,
					})
				} else {
					// something went wrong
					setState('error')
				}
			})
		})

		return () => {
			didDispose = true
		}
	}, [id, app, theme])

	return { imageUrl, state }
}
