import { useEffect, useState } from 'react'
import {
	SerializedSchemaV2,
	TLRecord,
	TLStoreSnapshot,
	fetch,
	getHashForObject,
	useValue,
} from 'tldraw'
import { loadDataFromStore } from '../utils/tla/local-sync'
import { useApp } from './useAppState'

export function useServerThumbnail(id: string) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])

	const [imageUrl, setImageUrl] = useState<string | null>(null)

	useEffect(() => {
		let didDispose = false
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

			const result = await fetch(`http://localhost:5002/thumbnail`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id, snapshot, hash }),
			}).then((res) => res.json())

			if (result.screenshot) {
				setImageUrl(`data:image/png;base64,${result.screenshot}`)
			}
		})
		return () => {
			didDispose = true
		}
	}, [id, app, theme])

	return imageUrl
}
