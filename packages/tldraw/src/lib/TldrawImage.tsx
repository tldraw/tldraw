import {
	Editor,
	ErrorScreen,
	Expand,
	LoadingScreen,
	StoreSnapshot,
	TLAnyShapeUtilConstructor,
	TLPageId,
	TLRecord,
	TLSvgOptions,
	useShallowArrayIdentity,
	useTLStore,
} from '@tldraw/editor'
import { memo, useLayoutEffect, useMemo, useState } from 'react'
import { defaultShapeUtils } from './defaultShapeUtils'
import { usePreloadAssets } from './ui/hooks/usePreloadAssets'
import { getSvgAsImage, getSvgAsString } from './utils/export/export'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'

/**
 * Props for the {@link tldraw#TldrawImage} component.
 *
 * @public
 **/
export type TldrawImageProps = Expand<
	{
		/**
		 * The snapshot to display.
		 */
		snapshot: StoreSnapshot<TLRecord>

		/**
		 * The image format to use. Defaults to 'svg'.
		 */
		format?: 'svg' | 'png'

		/**
		 * The page to display. Defaults to the first page.
		 */
		pageId?: TLPageId

		/**
		 * Additional shape utils to use.
		 */
		shapeUtils?: readonly TLAnyShapeUtilConstructor[]
	} & Partial<TLSvgOptions>
>

/**
 * A renderered SVG image of a Tldraw snapshot.
 *
 * @example
 * ```tsx
 * <TldrawImage snapshot={snapshot} />
 * 	snapshot={snapshot}
 * 	pageId={pageId}
 * 	background={false}
 *  darkMode={true}
 *  bounds={new Box(0,0,600,400)}
 *  scale={1}
 * />
 * ```
 *
 * @public
 */
export const TldrawImage = memo(function TldrawImage(props: TldrawImageProps) {
	const [url, setUrl] = useState<string | null>(null)
	const [container, setContainer] = useState<HTMLDivElement | null>(null)

	const shapeUtils = useShallowArrayIdentity(props.shapeUtils ?? [])
	const shapeUtilsWithDefaults = useMemo(() => [...defaultShapeUtils, ...shapeUtils], [shapeUtils])
	const store = useTLStore({ snapshot: props.snapshot, shapeUtils: shapeUtilsWithDefaults })

	const assets = useDefaultEditorAssetsWithOverrides()
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(assets)

	const {
		pageId,
		bounds,
		scale,
		background,
		padding,
		darkMode,
		preserveAspectRatio,
		format = 'svg',
	} = props

	useLayoutEffect(() => {
		if (!container) return
		if (!store) return
		if (!preloadingComplete) return

		let isCancelled = false

		const tempElm = document.createElement('div')
		container.appendChild(tempElm)
		container.classList.add('tl-container', 'tl-theme__light')

		const editor = new Editor({
			store,
			shapeUtils: shapeUtilsWithDefaults ?? [],
			tools: [],
			getContainer: () => tempElm,
		})

		if (pageId) editor.setCurrentPage(pageId)

		const shapeIds = editor.getCurrentPageShapeIds()

		async function setSvg() {
			const svg = await editor.getSvg([...shapeIds], {
				bounds,
				scale,
				background,
				padding,
				darkMode,
				preserveAspectRatio,
			})

			if (svg && !isCancelled) {
				if (format === 'svg') {
					const string = await getSvgAsString(svg)
					if (!isCancelled) {
						const blob = new Blob([string], { type: 'image/svg+xml' })
						const url = URL.createObjectURL(blob)
						setUrl(url)
					}
				} else if (format === 'png') {
					const blob = await getSvgAsImage(svg, editor.environment.isSafari, {
						type: format,
						quality: 1,
						scale: 2,
					})
					if (blob && !isCancelled) {
						const url = URL.createObjectURL(blob)
						setUrl(url)
					}
				}
			}

			editor.dispose()
		}

		setSvg()

		return () => {
			isCancelled = true
		}
	}, [
		format,
		container,
		store,
		shapeUtilsWithDefaults,
		pageId,
		bounds,
		scale,
		background,
		padding,
		darkMode,
		preserveAspectRatio,
		preloadingComplete,
		preloadingError,
	])

	if (preloadingError) {
		return <ErrorScreen>Could not load assets.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return (
		<div ref={setContainer} style={{ position: 'relative', width: '100%', height: '100%' }}>
			{url && <img src={url} style={{ width: '100%', height: '100%' }} />}
		</div>
	)
})
