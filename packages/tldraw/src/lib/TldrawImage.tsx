import {
	ContainerProvider,
	Editor,
	EditorContext,
	ErrorScreen,
	LoadingScreen,
	StoreSnapshot,
	TLAnyShapeUtilConstructor,
	TLPageId,
	TLRecord,
	TLSvgOptions,
	useContainer,
	useEditor,
	useShallowArrayIdentity,
	useTLStore,
} from '@tldraw/editor'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { defaultShapeUtils } from './defaultShapeUtils'
import { usePreloadAssets } from './ui/hooks/usePreloadAssets'
import { exportToString } from './utils/export/export'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'

/** @public */
export type TldrawImageProps = {
	snapshot: StoreSnapshot<TLRecord>
	pageId?: TLPageId
	opts?: Partial<TLSvgOptions>
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]
}

/** @public */
export function TldrawImage(props: TldrawImageProps) {
	const [container, setContainer] = useState<HTMLDivElement | null>(null)
	const shapeUtils = useShallowArrayIdentity(props.shapeUtils ?? [])

	const shapeUtilsWithDefaults = useMemo(() => [...defaultShapeUtils, ...shapeUtils], [shapeUtils])

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
					<TldrawImageEditor shapeUtils={shapeUtilsWithDefaults} {...props} />
				</ContainerProvider>
			)}
		</div>
	)
}

function TldrawImageEditor({ snapshot, shapeUtils, ...rest }: TldrawImageProps) {
	const store = useTLStore({ snapshot, shapeUtils })
	const container = useContainer()
	const [editor, setEditor] = useState<Editor | null>(null)

	useLayoutEffect(() => {
		const editor = new Editor({
			store,
			shapeUtils: shapeUtils ?? [],
			tools: [],
			getContainer: () => container,
		})
		setEditor(editor)
		return () => {
			editor.dispose()
		}
	}, [container, store, shapeUtils])

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
			<Layout {...rest} />
		</EditorContext.Provider>
	)
}

function Layout({ pageId, opts }: { pageId?: TLPageId; opts?: Partial<TLSvgOptions> }) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)

	useEffect(() => {
		getImageUrl(editor, pageId, opts).then((url) => {
			setUrl(url)
		})
	}, [editor, opts, pageId])

	return url ? <img src={url} style={{ width: '100%', height: '100%' }} /> : null
}

async function getImageUrl(
	editor: Editor,
	pageId: TLPageId = editor.getCurrentPageId(),
	opts?: Partial<TLSvgOptions>
) {
	const shapeIds = editor.getPageShapeIds(pageId)
	const string = await exportToString(editor, [...shapeIds], 'svg', opts)
	const blob = new Blob([string], { type: 'image/svg+xml' })
	return URL.createObjectURL(blob)
}
