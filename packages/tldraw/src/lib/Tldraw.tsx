import {
	Canvas,
	Editor,
	ErrorScreen,
	LoadingScreen,
	StoreSnapshot,
	TLEditorComponents,
	TLOnMountHandler,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	TldrawEditor,
	TldrawEditorBaseProps,
	assert,
	useEditor,
	useShallowArrayIdentity,
	useShallowObjectIdentity,
} from '@tldraw/editor'
import { useCallback, useDebugValue, useLayoutEffect, useMemo, useRef } from 'react'
import { TldrawHandles } from './canvas/TldrawHandles'
import { TldrawHoveredShapeIndicator } from './canvas/TldrawHoveredShapeIndicator'
import { TldrawScribble } from './canvas/TldrawScribble'
import { TldrawSelectionBackground } from './canvas/TldrawSelectionBackground'
import { TldrawSelectionForeground } from './canvas/TldrawSelectionForeground'
import {
	TLExternalContentProps,
	registerDefaultExternalContentHandlers,
} from './defaultExternalContentHandlers'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { registerDefaultSideEffects } from './defaultSideEffects'
import { defaultTools } from './defaultTools'
import { TldrawUi, TldrawUiProps } from './ui/TldrawUi'
import { usePreloadAssets } from './ui/hooks/usePreloadAssets'
import { TLUiComponents, useTldrawUiComponents } from './ui/hooks/useTldrawUiComponents'
import { useDefaultEditorAssetsWithOverrides } from './utils/static-assets/assetUrls'

/**@public */
export type TLComponents = TLEditorComponents & TLUiComponents

/** @public */
export type TldrawProps =
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
					persistenceKey?: string
					sessionId?: string
					defaultName?: string
					/**
					 * A snapshot to load for the store's initial data / schema.
					 */
					snapshot?: StoreSnapshot<TLRecord>
			  }
		)

/** @public */
export function Tldraw(props: TldrawProps) {
	const {
		children,
		maxImageDimension,
		maxAssetSize,
		acceptedImageMimeTypes,
		acceptedVideoMimeTypes,
		onMount,
		...rest
	} = props

	const components = useShallowObjectIdentity(rest.components ?? {})
	const shapeUtils = useShallowArrayIdentity(rest.shapeUtils ?? [])
	const tools = useShallowArrayIdentity(rest.tools ?? [])

	const withDefaults = {
		initialState: 'select',
		...rest,
		components: useMemo(
			() => ({
				Scribble: TldrawScribble,
				CollaboratorScribble: TldrawScribble,
				SelectionForeground: TldrawSelectionForeground,
				SelectionBackground: TldrawSelectionBackground,
				Handles: TldrawHandles,
				HoveredShapeIndicator: TldrawHoveredShapeIndicator,
				...components,
			}),
			[components]
		),
		shapeUtils: useMemo(() => [...defaultShapeUtils, ...shapeUtils], [shapeUtils]),
		tools: useMemo(() => [...defaultTools, ...defaultShapeTools, ...tools], [tools]),
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
				<InsideOfEditorContext
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

const defaultAcceptedImageMimeTypes = Object.freeze([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/svg+xml',
])

const defaultAcceptedVideoMimeTypes = Object.freeze(['video/mp4', 'video/quicktime'])

// We put these hooks into a component here so that they can run inside of the context provided by TldrawEditor.
function InsideOfEditorContext({
	maxImageDimension = 1000,
	maxAssetSize = 10 * 1024 * 1024, // 10mb
	acceptedImageMimeTypes = defaultAcceptedImageMimeTypes,
	acceptedVideoMimeTypes = defaultAcceptedVideoMimeTypes,
	onMount,
}: Partial<TLExternalContentProps & { onMount: TLOnMountHandler }>) {
	const editor = useEditor()

	const onMountEvent = useEvent((editor: Editor) => {
		const unsubs: (void | (() => void) | undefined)[] = []

		unsubs.push(...registerDefaultSideEffects(editor))

		// for content handling, first we register the default handlers...
		registerDefaultExternalContentHandlers(editor, {
			maxImageDimension,
			maxAssetSize,
			acceptedImageMimeTypes,
			acceptedVideoMimeTypes,
		})

		// ...then we run the onMount prop, which may override the above
		unsubs.push(onMount?.(editor))

		return () => {
			unsubs.forEach((fn) => fn?.())
		}
	})

	useLayoutEffect(() => {
		if (editor) return onMountEvent?.(editor)
	}, [editor, onMountEvent])

	const { ContextMenu } = useTldrawUiComponents()
	if (!ContextMenu) return <Canvas />

	return <ContextMenu canvas={<Canvas />} />
}

// duped from tldraw editor
function useEvent<Args extends Array<unknown>, Result>(
	handler: (...args: Args) => Result
): (...args: Args) => Result {
	const handlerRef = useRef<(...args: Args) => Result>()

	useLayoutEffect(() => {
		handlerRef.current = handler
	})

	useDebugValue(handler)

	return useCallback((...args: Args) => {
		const fn = handlerRef.current
		assert(fn, 'fn does not exist')
		return fn(...args)
	}, [])
}
