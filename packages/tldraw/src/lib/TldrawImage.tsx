import {
	ContainerProvider,
	Editor,
	EditorContext,
	StoreSnapshot,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	useContainer,
	useEditor,
	useLocalStore,
} from '@tldraw/editor'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { defaultTools } from './defaultTools'
import { exportToString } from './utils/export/export'

/** @public */
export function TldrawImage({ snapshot }: { snapshot?: StoreSnapshot<TLRecord> }) {
	const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

	return (
		<div
			ref={setContainer}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
			}}
		>
			{container && (
				<ContainerProvider container={container}>
					<TldrawImageWithOwnStore snapshot={snapshot} />
				</ContainerProvider>
			)}
		</div>
	)
}

function TldrawImageWithOwnStore({ snapshot }: { snapshot?: StoreSnapshot<TLRecord> }) {
	const shapeUtils = defaultShapeUtils
	const store = useLocalStore({ snapshot, shapeUtils })

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

	return (
		<EditorContext.Provider value={editor}>
			<Layout />
		</EditorContext.Provider>
	)
}

async function getImageUrl(editor: Editor) {
	const shapeIds = editor.getPageShapeIds(editor.getCurrentPage().id)
	const string = await exportToString(editor, [...shapeIds], 'svg', { background: false })
	const blob = new Blob([string], { type: 'image/svg+xml' })
	return URL.createObjectURL(blob)
}

function Layout() {
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)

	useEffect(() => {
		getImageUrl(editor).then((url) => {
			setUrl(url)
		})
	}, [editor])

	return url ? (
		<img src={url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
	) : null
}
