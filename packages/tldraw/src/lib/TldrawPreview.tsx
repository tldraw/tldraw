import {
	mergeArraysAndReplaceDefaults,
	TLAnyAssetUtilConstructor,
	TLAnyBindingUtilConstructor,
	TLAnyShapeUtilConstructor,
	TLOnMountHandler,
	TldrawViewer,
	TldrawViewerProps,
	useShallowArrayIdentity,
} from '@tldraw/editor'
import { useCallback, useMemo } from 'react'
import { defaultAssetUtils } from './defaultAssetUtils'
import { defaultBindingUtils } from './defaultBindingUtils'
import { defaultShapeUtils } from './defaultShapeUtils'
import { allDefaultFontFaces } from './shapes/shared/defaultFonts'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'
import { defaultAddFontsFromNode, tipTapDefaultExtensions } from './utils/text/richText'

/**
 * Props for the {@link TldrawPreview} component.
 *
 * @public
 */
export type TldrawPreviewProps = Omit<
	TldrawViewerProps,
	'shapeUtils' | 'bindingUtils' | 'assetUtils'
> & {
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]
	bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	assetUtils?: readonly TLAnyAssetUtilConstructor[]
}

/**
 * A read-only preview renderer pre-configured with tldraw's default shape, binding,
 * and asset utils. Use this to render a tldraw document as a static preview without
 * mounting the full editor UI, tools, or event handlers.
 *
 * @public @react
 */
export function TldrawPreview({
	shapeUtils = [],
	bindingUtils = [],
	assetUtils = [],
	onMount,
	assetUrls,
	options,
	...rest
}: TldrawPreviewProps) {
	const _shapeUtils = useShallowArrayIdentity(shapeUtils)
	const shapeUtilsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('type', _shapeUtils, defaultShapeUtils),
		[_shapeUtils]
	)

	const _bindingUtils = useShallowArrayIdentity(bindingUtils)
	const bindingUtilsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('type', _bindingUtils, defaultBindingUtils),
		[_bindingUtils]
	)

	const _assetUtils = useShallowArrayIdentity(assetUtils)
	const assetUtilsWithDefaults = useMemo(
		() => mergeArraysAndReplaceDefaults('type', _assetUtils, defaultAssetUtils),
		[_assetUtils]
	)

	const assets = useDefaultEditorAssetsWithOverrides(assetUrls)

	const optionsWithDefaults = useMemo(
		() => ({
			...options,
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				...options?.text,
				tipTapConfig: {
					extensions: tipTapDefaultExtensions,
					...options?.text?.tipTapConfig,
				},
			},
		}),
		[options]
	)

	const handleMount = useCallback<TLOnMountHandler>(
		(editor) => {
			editor.fonts.requestFonts(allDefaultFontFaces)
			return onMount?.(editor)
		},
		[onMount]
	)

	return (
		<TldrawViewer
			{...rest}
			shapeUtils={shapeUtilsWithDefaults}
			bindingUtils={bindingUtilsWithDefaults}
			assetUtils={assetUtilsWithDefaults}
			assetUrls={assets}
			options={optionsWithDefaults}
			onMount={handleMount}
		/>
	)
}
