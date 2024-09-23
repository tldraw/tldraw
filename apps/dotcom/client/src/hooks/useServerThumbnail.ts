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
} from '../utils/tla/local-sync'
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
		}).then((data) => {
			if (didReturnRemote) return
			if (data?.thumbnail) {
				setImageUrl(`data:image/png;base64,${data.thumbnail}`)
			}
		})

		// Also start loading the remote thumbnail for this file
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

			// Get the result from the server
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
					thumbnail: result.screenshot,
					didCancel: () => didDispose,
				})

				console.log('got the thumbnail')
			} else {
				// something went wrong
				console.log('error fetching thumbnail')
				setState('error')
			}
		})
		return () => {
			didDispose = true
		}
	}, [id, app, theme])

	return { imageUrl, state }
}
