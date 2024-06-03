import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/tlsync'
import { useCallback, useState } from 'react'
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw'
import '../../../styles/core.css'
import { assetUrls } from '../../utils/assetUrls'
import { useFileSystem } from '../../utils/useFileSystem'

export function BoardHistorySnapshot({
	data,
	roomId,
	timestamp,
	token,
}: {
	data: RoomSnapshot
	roomId: string
	timestamp: string
	token?: string
}) {
	const [store] = useState(() => {
		const store = createTLStore({ shapeUtils: defaultShapeUtils })
		store.loadSnapshot({
			schema: data.schema!,
			store: Object.fromEntries(data.documents.map((doc) => [doc.state.id, doc.state])) as any,
		})
		return store
	})

	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: true })

	const restoreVersion = useCallback(async () => {
		const sure = window.confirm('Are you sure?')
		if (!sure) return

		const res = await fetch(`/api/${ROOM_PREFIX}/${roomId}/restore`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token
					? {
							Authorization: 'Bearer ' + token,
						}
					: {}),
			},
			body: JSON.stringify({ timestamp }),
		})

		if (!res.ok) {
			window.alert('Something went wrong!')
			return
		}

		window.alert('done')
	}, [roomId, timestamp, token])

	return (
		<>
			<div className="tldraw__editor">
				<Tldraw
					store={store}
					assetUrls={assetUrls}
					onMount={(editor) => {
						editor.updateInstanceState({ isReadonly: true })
						setTimeout(() => {
							editor.setCurrentTool('hand')
						})
					}}
					overrides={[fileSystemUiOverrides]}
					inferDarkMode
				/>
			</div>
			<div className="board-history__restore">
				<button onClick={restoreVersion}>{'Restore this version'}</button>
			</div>
		</>
	)
}
