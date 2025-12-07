import {
	Editor,
	TLAnyBindingUtilConstructor,
	TLAnyShapeUtilConstructor,
	TLEditorSnapshot,
	TLImageExportOptions,
	TLPageId,
	TLStoreSnapshot,
	TLTextOptions,
	mergeArraysAndReplaceDefaults,
	useShallowArrayIdentity,
	useTLStore,
} from '@tldraw/editor'
import { memo, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { defaultBindingUtils } from './defaultBindingUtils'
import { defaultShapeUtils } from './defaultShapeUtils'
import { TLUiAssetUrlOverrides } from './ui/assetUrls'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'
import { defaultAddFontsFromNode, tipTapDefaultExtensions } from './utils/text/richText'

/** @public */
export interface TldrawImageProps extends TLImageExportOptions {
	/**
	 * The snapshot to display.
	 */
	snapshot: Partial<TLEditorSnapshot> | TLStoreSnapshot

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
	/**
	 * Additional binding utils to use.
	 */
	bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	/**
	 * The license key.
	 */
	licenseKey?: string
	/**
	 * Asset URL overrides.
	 */
	assetUrls?: TLUiAssetUrlOverrides
	/**
	 * Text options for the editor.
	 */
	textOptions?: TLTextOptions
}

const defaultTextOptions = {
	tipTapConfig: {
		extensions: tipTapDefaultExtensions,
	},
	addFontsFromNode: defaultAddFontsFromNode,
}

/**
 * A rendered SVG image of a Tldraw snapshot.
 *
 * @example
 * ```tsx
 * <TldrawImage
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
 * @react
 */
export const TldrawImage = memo(function TldrawImage(props: TldrawImageProps) {
	const [url, setUrl] = useState<string | null>(null)
	const [container, setContainer] = useState<HTMLDivElement | null>(null)

	const _shapeUtils = useShallowArrayIdentity(props.shapeUtils ?? [])
	const shapeUtilsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('type', _shapeUtils, defaultShapeUtils),
		[_shapeUtils]
	)
	const _bindingUtils = useShallowArrayIdentity(props.bindingUtils ?? [])
	const bindingUtilsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('type', _bindingUtils, defaultBindingUtils),
		[_bindingUtils]
	)
	const store = useTLStore({ snapshot: props.snapshot, shapeUtils: shapeUtilsWithDefaults })

	const {
		pageId,
		bounds,
		scale,
		pixelRatio,
		background,
		padding,
		darkMode,
		preserveAspectRatio,
		format = 'svg',
		licenseKey,
		assetUrls,
		textOptions = defaultTextOptions,
	} = props
	const assetUrlsWithOverrides = useDefaultEditorAssetsWithOverrides(assetUrls)

	useLayoutEffect(() => {
		if (!container) return
		if (!store) return

		let isCancelled = false

		const tempElm = document.createElement('div')
		container.appendChild(tempElm)
		container.classList.add('tl-container', 'tl-theme__light')

		const editor = new Editor({
			store,
			shapeUtils: shapeUtilsWithDefaults,
			bindingUtils: bindingUtilsWithDefaults,
			tools: [],
			getContainer: () => tempElm,
			licenseKey,
			fontAssetUrls: assetUrlsWithOverrides.fonts,
			textOptions,
		})

		if (pageId) editor.setCurrentPage(pageId)

		const shapeIds = editor.getCurrentPageShapeIds()

		async function setSvg() {
			// We have to wait for the fonts to load so that we can correctly measure text sizes
			await editor.fonts.loadRequiredFontsForCurrentPage(editor.options.maxFontsToLoadBeforeRender)
			const imageResult = await editor.toImage([...shapeIds], {
				bounds,
				scale,
				background,
				padding,
				darkMode,
				preserveAspectRatio,
				format,
			})
			if (!imageResult || isCancelled) return

			const url = URL.createObjectURL(imageResult.blob)
			setUrl(url)

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
		bindingUtilsWithDefaults,
		pageId,
		bounds,
		scale,
		background,
		padding,
		darkMode,
		preserveAspectRatio,
		licenseKey,
		pixelRatio,
		assetUrlsWithOverrides,
		textOptions,
	])

	useEffect(() => {
		return () => {
			if (url) URL.revokeObjectURL(url)
		}
	}, [url])

	return (
		<div ref={setContainer} style={{ position: 'relative', width: '100%', height: '100%' }}>
			{url && (
				<img
					src={url}
					referrerPolicy="strict-origin-when-cross-origin"
					style={{ width: '100%', height: '100%' }}
				/>
			)}
		</div>
	)
})
