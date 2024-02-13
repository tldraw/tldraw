import {
	ContainerProvider,
	Editor,
	EditorContext,
	ErrorScreen,
	LoadingScreen,
	StoreSnapshot,
	TLRecord,
	TLSvgOptions,
	useContainer,
	useEditor,
	useTLStore,
} from '@tldraw/editor'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import { defaultShapeUtils } from './defaultShapeUtils'
import { usePreloadAssets } from './ui/hooks/usePreloadAssets'
import { exportToString } from './utils/export/export'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'

/** @public */
export function TldrawImage({
	snapshot,
	opts = {},
}: {
	snapshot?: StoreSnapshot<TLRecord>
	opts?: Partial<TLSvgOptions>
}) {
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
					<TldrawImageEditor snapshot={snapshot} opts={opts} />
				</ContainerProvider>
			)}
		</div>
	)
}

function TldrawImageEditor({
	snapshot,
	opts,
}: {
	snapshot?: StoreSnapshot<TLRecord>
	opts: Partial<TLSvgOptions>
}) {
	const shapeUtils = defaultShapeUtils
	const store = useTLStore({ snapshot, shapeUtils })
	const container = useContainer()
	const [editor, setEditor] = useState<Editor | null>(null)

	useLayoutEffect(() => {
		const editor = new Editor({
			store,
			shapeUtils: defaultShapeUtils,
			tools: [],
			getContainer: () => container,
		})
		setEditor(editor)
		return () => {
			editor.dispose()
		}
	}, [container, store, opts.darkMode])

	const assets = useDefaultEditorAssetsWithOverrides()
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(assets)

	if (preloadingError) {
		return <ErrorScreen>Could not load assets.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	if (!editor) {
		return null
	}

	return (
		<EditorContext.Provider value={editor}>
			<Layout opts={opts} />
		</EditorContext.Provider>
	)
}

async function getImageUrl(editor: Editor, opts: Partial<TLSvgOptions>) {
	const shapeIds = editor.getPageShapeIds(editor.getCurrentPage().id)
	const string = await exportToString(editor, [...shapeIds], 'svg', opts)
	const blob = new Blob([string], { type: 'image/svg+xml' })
	return URL.createObjectURL(blob)
}

function Layout({ opts }: { opts: Partial<TLSvgOptions> }) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)

	useEffect(() => {
		getImageUrl(editor, opts).then((url) => {
			setUrl(url)
		})
	}, [editor, opts])

	return url ? <img src={url} style={{ width: '100%', height: '100%' }} /> : null
}
