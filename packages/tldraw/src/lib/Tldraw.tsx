import {
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DefaultSpinner,
	ErrorScreen,
	LoadingScreen,
	TLEditorComponents,
	TLOnMountHandler,
	TldrawEditor,
	TldrawEditorBaseProps,
	TldrawEditorStoreProps,
	useEditor,
	useEditorComponents,
	useOnMount,
	useShallowArrayIdentity,
	useShallowObjectIdentity,
} from '@tldraw/editor'
import { useMemo } from 'react'
import { TldrawHandles } from './canvas/TldrawHandles'
import { TldrawScribble } from './canvas/TldrawScribble'
import { TldrawSelectionBackground } from './canvas/TldrawSelectionBackground'
import { TldrawSelectionForeground } from './canvas/TldrawSelectionForeground'
import { TldrawShapeIndicators } from './canvas/TldrawShapeIndicators'
import { defaultBindingUtils } from './defaultBindingUtils'
import {
	TLExternalContentProps,
	registerDefaultExternalContentHandlers,
} from './defaultExternalContentHandlers'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { registerDefaultSideEffects } from './defaultSideEffects'
import { defaultTools } from './defaultTools'
import { TldrawUi, TldrawUiProps } from './ui/TldrawUi'
import { TLUiComponents, useTldrawUiComponents } from './ui/context/components'
import { useToasts } from './ui/context/toasts'
import { usePreloadAssets } from './ui/hooks/usePreloadAssets'
import { useTranslation } from './ui/hooks/useTranslation/useTranslation'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'

/**
 * Override the default react components used by the editor and UI. Set components to null to
 * disable them entirely.
 *
 * @example
 * ```tsx
 * import {Tldraw, TLComponents} from 'tldraw'
 *
 * const components: TLComponents = {
 *    Scribble: MyCustomScribble,
 * }
 *
 * export function MyApp() {
 *   return <Tldraw components={components} />
 * }
 * ```
 *
 *
 * @public
 */
export interface TLComponents extends TLEditorComponents, TLUiComponents {}

/** @public */
export interface TldrawBaseProps
	extends TldrawUiProps,
		TldrawEditorBaseProps,
		TLExternalContentProps {
	components?: TLComponents
}

/** @public */
export type TldrawProps = TldrawBaseProps & TldrawEditorStoreProps

/** @public @react */
export function Tldraw(props: TldrawProps) {
	const {
		children,
		maxImageDimension,
		maxAssetSize,
		acceptedImageMimeTypes,
		acceptedVideoMimeTypes,
		onMount,
		components = {},
		shapeUtils = [],
		bindingUtils = [],
		tools = [],
		...rest
	} = props

	const _components = useShallowObjectIdentity(components)
	const componentsWithDefault = useMemo(
		() => ({
			Scribble: TldrawScribble,
			ShapeIndicators: TldrawShapeIndicators,
			CollaboratorScribble: TldrawScribble,
			SelectionForeground: TldrawSelectionForeground,
			SelectionBackground: TldrawSelectionBackground,
			Handles: TldrawHandles,
			..._components,
		}),
		[_components]
	)

	const _shapeUtils = useShallowArrayIdentity(shapeUtils)
	const shapeUtilsWithDefaults = useMemo(
		() => [...defaultShapeUtils, ..._shapeUtils],
		[_shapeUtils]
	)

	const _bindingUtils = useShallowArrayIdentity(bindingUtils)
	const bindingUtilsWithDefaults = useMemo(
		() => [...defaultBindingUtils, ..._bindingUtils],
		[_bindingUtils]
	)

	const _tools = useShallowArrayIdentity(tools)
	const toolsWithDefaults = useMemo(
		() => [...defaultTools, ...defaultShapeTools, ..._tools],
		[_tools]
	)

	const assets = useDefaultEditorAssetsWithOverrides(rest.assetUrls)
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(assets)
	if (preloadingError) {
		return <ErrorScreen>Could not load assets. Please refresh the page.</ErrorScreen>
	}
	if (!preloadingComplete) {
		return (
			<LoadingScreen>
				<DefaultSpinner />
			</LoadingScreen>
		)
	}

	return (
		<TldrawEditor
			initialState="select"
			{...rest}
			components={componentsWithDefault}
			shapeUtils={shapeUtilsWithDefaults}
			bindingUtils={bindingUtilsWithDefaults}
			tools={toolsWithDefaults}
		>
			<TldrawUi {...rest} components={componentsWithDefault}>
				<InsideOfEditorAndUiContext
					maxImageDimension={maxImageDimension}
					maxAssetSize={maxAssetSize}
					acceptedImageMimeTypes={acceptedImageMimeTypes}
					acceptedVideoMimeTypes={acceptedVideoMimeTypes}
					onMount={onMount}
				/>
				{children}
			</TldrawUi>
		</TldrawEditor>
	)
}

// We put these hooks into a component here so that they can run inside of the context provided by TldrawEditor and TldrawUi.
function InsideOfEditorAndUiContext({
	maxImageDimension = 5000,
	maxAssetSize = 10 * 1024 * 1024, // 10mb
	acceptedImageMimeTypes = DEFAULT_SUPPORTED_IMAGE_TYPES,
	acceptedVideoMimeTypes = DEFAULT_SUPPORT_VIDEO_TYPES,
	onMount,
}: TLExternalContentProps & { onMount?: TLOnMountHandler }) {
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()

	useOnMount(() => {
		const unsubs: (void | (() => void) | undefined)[] = []

		unsubs.push(registerDefaultSideEffects(editor))

		// for content handling, first we register the default handlers...
		registerDefaultExternalContentHandlers(
			editor,
			{
				maxImageDimension,
				maxAssetSize,
				acceptedImageMimeTypes,
				acceptedVideoMimeTypes,
			},
			{
				toasts,
				msg,
			}
		)

		// ...then we call the store's on mount which may override them...
		unsubs.push(editor.store.props.onMount(editor))

		// ...then we run the user's onMount prop, which may override things again.
		unsubs.push(onMount?.(editor))

		return () => {
			unsubs.forEach((fn) => fn?.())
		}
	})

	const { Canvas } = useEditorComponents()
	const { ContextMenu } = useTldrawUiComponents()

	if (ContextMenu) {
		// should wrap canvas
		return <ContextMenu />
	}

	if (Canvas) {
		return <Canvas />
	}

	return null
}
