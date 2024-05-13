import {
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	Editor,
	ErrorScreen,
	Expand,
	LoadingScreen,
	MigrationSequence,
	StoreSnapshot,
	TLEditorComponents,
	TLOnMountHandler,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	TldrawEditor,
	TldrawEditorBaseProps,
	useEditor,
	useEditorComponents,
	useEvent,
	useShallowArrayIdentity,
	useShallowObjectIdentity,
} from '@tldraw/editor'
import { useLayoutEffect, useMemo } from 'react'
import { TldrawHandles } from './canvas/TldrawHandles'
import { TldrawScribble } from './canvas/TldrawScribble'
import { TldrawSelectionBackground } from './canvas/TldrawSelectionBackground'
import { TldrawSelectionForeground } from './canvas/TldrawSelectionForeground'
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

/**@public */
export type TLComponents = Expand<TLEditorComponents & TLUiComponents>

/** @public */
export type TldrawProps = Expand<
	// combine components from base editor and ui
	(Omit<TldrawUiProps, 'components'> &
		Omit<TldrawEditorBaseProps, 'components'> & {
			components?: TLComponents
		}) &
		// external content
		Partial<TLExternalContentProps> &
		// store stuff
		(| {
					store: TLStore | TLStoreWithStatus
			  }
			| {
					store?: undefined
					migrations?: readonly MigrationSequence[]
					persistenceKey?: string
					sessionId?: string
					defaultName?: string
					/**
					 * A snapshot to load for the store's initial data / schema.
					 */
					snapshot?: StoreSnapshot<TLRecord>
			  }
		)
>

/** @public */
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
		return <LoadingScreen>Loading assets...</LoadingScreen>
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
	maxImageDimension = 1000,
	maxAssetSize = 10 * 1024 * 1024, // 10mb
	acceptedImageMimeTypes = DEFAULT_SUPPORTED_IMAGE_TYPES,
	acceptedVideoMimeTypes = DEFAULT_SUPPORT_VIDEO_TYPES,
	onMount,
}: Partial<TLExternalContentProps & { onMount: TLOnMountHandler }>) {
	const editor = useEditor()
	const toasts = useToasts()
	const msg = useTranslation()

	const onMountEvent = useEvent((editor: Editor) => {
		const unsubs: (void | (() => void) | undefined)[] = []

		unsubs.push(...registerDefaultSideEffects(editor))

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

		// ...then we run the onMount prop, which may override the above
		unsubs.push(onMount?.(editor))

		return () => {
			unsubs.forEach((fn) => fn?.())
		}
	})

	useLayoutEffect(() => {
		if (editor) return onMountEvent?.(editor)
	}, [editor, onMountEvent])

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
