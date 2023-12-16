import {
	HistoryEntry,
	TLRecord,
	TLStoreSnapshot,
	Tldraw,
	deepCopy,
	useEditor,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function PlaybackExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_playback_example">
				<SneakyPlayback />
			</Tldraw>
		</div>
	)
}

function SneakyPlayback() {
	const editor = useEditor()
	const rChanges = useRef<{ time: number; change: HistoryEntry<TLRecord> }[]>([])
	const rCursor = useRef<number>(0)
	const rInitialTime = useRef<number>(0)
	const [initialSnapshot] = useState<TLStoreSnapshot>(editor.store.getSnapshot('document'))

	const [state, setState] = useState<
		| {
				name: 'playing'
		  }
		| {
				name: 'recording'
		  }
		| {
				name: 'paused'
		  }
	>({ name: 'recording' })

	useEffect(() => {
		// When changes from the store are created, push them to the array
		return editor.store.listen(
			(change) => {
				switch (state.name) {
					case 'recording':
						if (rInitialTime.current === 0) {
							rInitialTime.current = Date.now()
						}

						rChanges.current.push({ time: Date.now(), change: deepCopy(change) })
						rCursor.current = rChanges.current.length - 1
				}
			},
			{
				scope: 'document',
				source: 'user',
			}
		)
	}, [editor, state])

	const rRunningTime = useRef<number>(0)

	const updateOnTickForward = useCallback(
		(elapsed: number) => {
			if (rCursor.current >= rChanges.current.length - 1) {
				editor.off('tick', updateOnTickForward)
				setState({ name: 'paused' })
			}

			const after = rRunningTime.current
			rRunningTime.current = after + elapsed

			const toAdd: TLRecord[] = []
			const toRemove: TLRecord['id'][] = []

			for (let i = rCursor.current; i < rChanges.current.length; i++) {
				rCursor.current = i
				const change = rChanges.current[i]
				if (change.time <= after) {
					toAdd.push(
						...Object.values(change.change.changes.added),
						...Object.values(change.change.changes.updated).map((c) => c[1])
					)
					toRemove.push(...Object.values(change.change.changes.removed).map((c) => c.id))
				} else {
					break
				}
			}

			if (toAdd.length || toRemove.length) {
				editor.store.mergeRemoteChanges(() => {
					editor.store.put(toAdd)
					editor.store.remove(toRemove)
				})
			}
		},
		[editor]
	)

	const play = useCallback(() => {
		editor.updateInstanceState({ isReadonly: true })
		setState({ name: 'playing' })
		editor.on('tick', updateOnTickForward)
	}, [updateOnTickForward, editor])

	const onReplay = useCallback(() => {
		editor.store.loadSnapshot(initialSnapshot)
		rRunningTime.current = rInitialTime.current
		rCursor.current = 0
		play()
	}, [initialSnapshot, play, editor])

	const onPause = useCallback(() => {
		editor.off('tick', updateOnTickForward)
		setState({ name: 'paused' })
	}, [editor, updateOnTickForward])

	const onResume = useCallback(() => {
		play()
	}, [play])

	const onRecord = useCallback(() => {
		setState({ name: 'recording' })
		rChanges.current = rChanges.current.slice(0, rCursor.current + 1)
		editor.updateInstanceState({ isReadonly: false })
	}, [editor])

	return (
		<div style={{ position: 'absolute', top: 64, left: 8, zIndex: 9999 }}>
			{state.name === 'recording' || state.name === 'paused' ? (
				<button onClick={onReplay}>Replay</button>
			) : null}
			{state.name === 'paused' ? (
				<button onClick={onResume}>Resume</button>
			) : (
				<button onClick={onPause}>Pause</button>
			)}
			<button onClick={onRecord}>Record</button>
			{state.name}
		</div>
	)
}
