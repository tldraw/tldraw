import { Editor, TLStore, TLStoreWithStatus, useLocalStore } from '@tldraw/editor'
import { ContainerProvider, useContainer } from '@tldraw/editor/src/lib/hooks/useContainer'
import { EditorContext } from '@tldraw/editor/src/lib/hooks/useEditor'
import React, { useLayoutEffect, useState } from 'react'

/** @public */
export function TldrawImage() {
	const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

	return (
		<div
			ref={setContainer}
			style={{
				width: '100%',
				height: '100%',
				backgroundColor: 'lightblue',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			{container && (
				<ContainerProvider container={container}>
					<TldrawImageWithOwnStore />
				</ContainerProvider>
			)}
		</div>
	)
}

function TldrawImageWithOwnStore() {
	const store = useLocalStore({})

	return <TldrawImageWithLoadingStore store={store} />
}

function TldrawImageWithLoadingStore({ store }: { store: TLStoreWithStatus }) {
	switch (store.status) {
		case 'error': {
			throw store.error
		}
		case 'loading': {
			// const LoadingScreen = rest.components?.LoadingScreen ?? DefaultLoadingScreen
			return <div>Placeholder loading screen</div>
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
			shapeUtils: [],
			tools: [],
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
			<div>Placeholder</div>
		</EditorContext.Provider>
	)
}
