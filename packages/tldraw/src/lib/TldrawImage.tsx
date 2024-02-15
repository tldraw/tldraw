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
	useEditor,
	useShallowArrayIdentity,
	useTLStore,
} from '@tldraw/editor'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { defaultShapeUtils } from './defaultShapeUtils'
import { usePreloadAssets } from './ui/hooks/usePreloadAssets'
import { exportToString } from './utils/export/export'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'

/**
 * Props for the {@link @tldraw/tldraw#TldrawImage} component.
 *
 * @public
 **/
export type TldrawImageProps = {
	/**
	 * The snapshot to display.
	 */
	snapshot: StoreSnapshot<TLRecord>

	/**
	 * The page to display. Defaults to the first page.
	 */
	pageId?: TLPageId

	/**
	 * Options for the displayed image.
	 */
	opts?: Partial<TLSvgOptions>

	/**
	 * Additional shape utils to use.
	 */
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]
}

/**
 * A renderered SVG image of a Tldraw snapshot.
 *
 * @example
 * ```tsx
 * <TldrawImage snapshot={snapshot} />
 * ```
 *
 * @example
 * ```tsx
 * <TldrawImage
 * 	snapshot={snapshot}
 * 	pageId={pageId}
 * 	opts={{ background: false, darkMode: true }}
 * />
 * ```
 *
 * @public
 */
export function TldrawImage(props: TldrawImageProps) {
	const [container, setContainer] = useState<HTMLDivElement | null>(null)
	const [editor, setEditor] = useState<Editor | null>(null)

	const shapeUtils = useShallowArrayIdentity(props.shapeUtils ?? [])
	const shapeUtilsWithDefaults = useMemo(() => [...defaultShapeUtils, ...shapeUtils], [shapeUtils])
	const store = useTLStore({ snapshot: props.snapshot, shapeUtils: shapeUtilsWithDefaults })

	const assets = useDefaultEditorAssetsWithOverrides()
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(assets)

	useLayoutEffect(() => {
		if (!container) return
		const editor = new Editor({
			store,
			shapeUtils: shapeUtilsWithDefaults ?? [],
			tools: [],
			getContainer: () => container,
		})
		setEditor(editor)
		return () => {
			editor.dispose()
		}
	}, [container, store, shapeUtilsWithDefaults])

	if (preloadingError) {
		return <ErrorScreen>Could not load assets.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return (
		<div ref={setContainer} style={{ position: 'relative', width: '100%', height: '100%' }}>
			{container && (
				<ContainerProvider container={container}>
					{editor && (
						<EditorContext.Provider value={editor}>
							<TldrawImageSvg pageId={props.pageId} opts={props.opts} />
						</EditorContext.Provider>
					)}
				</ContainerProvider>
			)}
		</div>
	)
}

function TldrawImageSvg({ pageId, opts }: { pageId?: TLPageId; opts?: Partial<TLSvgOptions> }) {
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
