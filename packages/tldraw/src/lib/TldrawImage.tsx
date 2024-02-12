import {
	Editor,
	StoreSnapshot,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	useLocalStore,
} from '@tldraw/editor'
import { ContainerProvider, useContainer } from '@tldraw/editor/src/lib/hooks/useContainer'
import { EditorContext, useEditor } from '@tldraw/editor/src/lib/hooks/useEditor'
import React, { useEffect, useLayoutEffect, useState } from 'react'
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

	return (
		<EditorContext.Provider value={editor}>
			<Layout />
		</EditorContext.Provider>
	)
}

async function getImageUrl(editor: Editor) {
	const shapeIds = editor.getPageShapeIds(editor.getCurrentPage().id)
	const svg = await editor.getSvg([...shapeIds], { scale: 1, background: false })
	if (!svg) throw new Error('Could not construct SVG.')
	const data = new XMLSerializer().serializeToString(svg)
	const blob = new Blob([data], { type: 'image/svg+xml' })
	const url = URL.createObjectURL(blob)
	return url
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
