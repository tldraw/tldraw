import {
	Canvas,
	ErrorScreen,
	LoadingScreen,
	RecursivePartial,
	TldrawEditor,
	TldrawEditorProps,
	useEditor,
} from '@tldraw/editor'
import { useLayoutEffect, useMemo } from 'react'
import { TldrawScribble } from './canvas/TldrawScribble'
import { TldrawSelectionForeground } from './canvas/TldrawSelectionForeground'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { defaultTools } from './defaultTools'
import { TldrawUi, TldrawUiProps } from './ui/TldrawUi'
import { ContextMenu } from './ui/components/ContextMenu'
import { TLEditorAssetUrls, useDefaultEditorAssetsWithOverrides } from './utils/assetUrls'
import { usePreloadAssets } from './utils/usePreloadAssets'

/** @public */
export function Tldraw(
	props: TldrawEditorProps &
		TldrawUiProps & {
			/**
			 * Urls for the editor to find fonts and other assets.
			 */
			assetUrls?: RecursivePartial<TLEditorAssetUrls>
		}
) {
	const { children, ...rest } = props

	const withDefaults: TldrawEditorProps = {
		initialState: 'select',
		...rest,
		components: useMemo(
			() => ({
				Scribble: TldrawScribble,
				SelectionForeground: TldrawSelectionForeground,
				...rest.components,
			}),
			[rest.components]
		),
		shapeUtils: useMemo(
			() => [...defaultShapeUtils, ...(rest.shapeUtils ?? [])],
			[rest.shapeUtils]
		),
		tools: useMemo(
			() => [...defaultTools, ...defaultShapeTools, ...(rest.tools ?? [])],
			[rest.tools]
		),
	}

	const assets = useDefaultEditorAssetsWithOverrides(rest.assetUrls)

	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(assets)

	if (preloadingError) {
		return <ErrorScreen>Could not load assets. Please refresh the page.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return (
		<TldrawEditor {...withDefaults}>
			<TldrawUi {...withDefaults}>
				<ContextMenu>
					<Canvas />
				</ContextMenu>
				{children}
				<Hacks />
			</TldrawUi>
		</TldrawEditor>
	)
}

function Hacks() {
	const editor = useEditor()

	useLayoutEffect(() => {
		// Register external content handlers

		// Set z to trigger the zoom tool
		editor.root.onKeyDown = (info) => {
			switch (info.code) {
				case 'KeyZ': {
					if (!(info.shiftKey || info.ctrlKey)) {
						const currentTool = editor.root.current.value
						if (currentTool && currentTool.current.value?.id === 'idle') {
							editor.setSelectedTool('zoom', { ...info, onInteractionEnd: currentTool.id })
						}
					}
					break
				}
			}
		}
	})

	return null
}
