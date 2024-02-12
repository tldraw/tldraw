import {
	Canvas,
	Editor,
	StoreSnapshot,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	useLocalStore,
} from '@tldraw/editor'
import { ContainerProvider, useContainer } from '@tldraw/editor/src/lib/hooks/useContainer'
import { EditorContext } from '@tldraw/editor/src/lib/hooks/useEditor'
import React, { useLayoutEffect, useState } from 'react'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { defaultTools } from './defaultTools'

/** @public */
export function TldrawImage({
	snapshot,
	persistenceKey,
}: {
	snapshot?: StoreSnapshot<TLRecord>
	persistenceKey?: string
}) {
	const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

	return (
		<div
			ref={setContainer}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				outline: 'black solid 1px',
				// display: 'flex',
				// justifyContent: 'center',
				// alignItems: 'center',
			}}
		>
			{container && (
				<ContainerProvider container={container}>
					<TldrawImageWithOwnStore snapshot={snapshot} persistenceKey={persistenceKey} />
				</ContainerProvider>
			)}
		</div>
	)
}

function TldrawImageWithOwnStore({
	snapshot,
	persistenceKey,
}: {
	snapshot?: StoreSnapshot<TLRecord>
	persistenceKey?: string
}) {
	const shapeUtils = defaultShapeUtils
	const store = useLocalStore({ snapshot, shapeUtils, persistenceKey })

	return <TldrawImageWithLoadingStore store={store} />
}

function TldrawImageWithLoadingStore({ store }: { store: TLStoreWithStatus }) {
	switch (store.status) {
		case 'error': {
			throw store.error
		}
		case 'loading': {
			// const LoadingScreen = rest.components?.LoadingScreen ?? DefaultLoadingScreen
			return null
		}
		case 'not-synced': {
			break
		}
		case 'synced-local': {
			break
		}
		case 'synced-remote': {
			break
		}
	}

	return <TldrawImageWithReadyStore store={store.store} />
}

function TldrawImageWithReadyStore({ store }: { store: TLStore }) {
	const container = useContainer()
	const [editor, setEditor] = useState<Editor | null>(null)

	useLayoutEffect(() => {
		const editor = new Editor({
			store,
			shapeUtils: defaultShapeUtils,
			tools: [...defaultTools, ...defaultShapeTools],
			getContainer: () => container,
		})
		;(window as any).app = editor
		;(window as any).editor = editor
		setEditor(editor)

		return () => {
			editor.dispose()
		}
	}, [container, store])

	if (!editor) return null

	// editor.updateViewportScreenBounds()

	return (
		<EditorContext.Provider value={editor}>
			<Canvas />
		</EditorContext.Provider>
	)
}
