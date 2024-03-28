import {
	Editor,
	ErrorScreen,
	Expand,
	LoadingScreen,
	StoreSnapshot,
	TLEditorComponents,
	TLNoteShape,
	TLOnMountHandler,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	TldrawEditor,
	TldrawEditorBaseProps,
	createShapeId,
	stopEventPropagation,
	track,
	useEditor,
	useEditorComponents,
	useEvent,
	useShallowArrayIdentity,
	useShallowObjectIdentity,
	useValue,
} from '@tldraw/editor'
import { useLayoutEffect, useMemo } from 'react'
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
import { NOTE_GRID_OFFSET } from './shapes/note/NoteShapeUtil'
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
			HoveredShapeIndicator: TldrawHoveredShapeIndicator,
			InFrontOfTheCanvas: NoteDuplicationHandles,
			..._components,
		}),
		[_components]
	)

	const _shapeUtils = useShallowArrayIdentity(shapeUtils)
	const shapeUtilsWithDefaults = useMemo(
		() => [...defaultShapeUtils, ..._shapeUtils],
		[_shapeUtils]
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

const defaultAcceptedImageMimeTypes = Object.freeze([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/svg+xml',
])

const defaultAcceptedVideoMimeTypes = Object.freeze(['video/mp4', 'video/quicktime'])

// We put these hooks into a component here so that they can run inside of the context provided by TldrawEditor and TldrawUi.
function InsideOfEditorAndUiContext({
	maxImageDimension = 1000,
	maxAssetSize = 10 * 1024 * 1024, // 10mb
	acceptedImageMimeTypes = defaultAcceptedImageMimeTypes,
	acceptedVideoMimeTypes = defaultAcceptedVideoMimeTypes,
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

const HANDLE_SIZE = 10
const NoteDuplicationHandles = track(() => {
	const editor = useEditor()

	const info = useValue(
		'selection bounds',
		() => {
			const screenBounds = editor.getViewportScreenBounds()
			const rotation = editor.getSelectionRotation()
			const rotatedScreenBounds = editor.getSelectionRotatedScreenBounds()
			const zoom = editor.getZoomLevel()
			if (!rotatedScreenBounds) return
			return {
				x: rotatedScreenBounds.x - screenBounds.x,
				y: rotatedScreenBounds.y - screenBounds.y,
				width: rotatedScreenBounds.width,
				height: rotatedScreenBounds.height,
				rotation: rotation,
				zoom,
			}
		},
		[editor]
	)

	const shapes = editor.getSelectedShapes()
	if (shapes.length === 0) return null
	if (shapes.length > 1) return null
	if (shapes[0].type !== 'note') return null
	if (!info) return
	const zoomOffsetAboveLeft = HANDLE_SIZE * 2.5 * info.zoom
	console.log({ zoomOffsetAboveLeft, HANDLE_SIZE })
	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				transformOrigin: 'top left',
				transform: `translate(${info.x}px, ${info.y}px) rotate(${info.rotation}rad)`,
				pointerEvents: 'all',
			}}
			onPointerDown={stopEventPropagation}
		>
			<DuplicateInDirectionButton
				shape={shapes[0] as TLNoteShape}
				y={-HANDLE_SIZE * 2.5}
				x={info.width / 2 - HANDLE_SIZE / 2}
				direction={'above'}
				rotation={-(Math.PI / 2)}
			/>
			<DuplicateInDirectionButton
				shape={shapes[0] as TLNoteShape}
				y={info.height / 2 - HANDLE_SIZE / 2}
				x={-HANDLE_SIZE * 2.5}
				direction={'left'}
				rotation={Math.PI}
			/>
			<DuplicateInDirectionButton
				shape={shapes[0] as TLNoteShape}
				y={info.height / 2 - HANDLE_SIZE / 2}
				x={info.width + HANDLE_SIZE * 1.5}
				direction={'right'}
				rotation={0}
			/>
			<DuplicateInDirectionButton
				shape={shapes[0] as TLNoteShape}
				y={info.height + HANDLE_SIZE * 1.5}
				x={info.width / 2 - HANDLE_SIZE / 2}
				direction={'below'}
				rotation={Math.PI / 2}
			/>
		</div>
	)
})

function DuplicateInDirectionButton({
	x,
	y,
	rotation,
	shape,
	direction,
}: {
	x: number
	y: number
	rotation: number
	shape: TLNoteShape
	direction: 'above' | 'below' | 'left' | 'right'
}) {
	const editor = useEditor()

	const offsetX =
		direction === 'left' ? -NOTE_GRID_OFFSET : direction === 'right' ? NOTE_GRID_OFFSET : 0
	const offsetY =
		direction === 'above' ? -NOTE_GRID_OFFSET : direction === 'below' ? NOTE_GRID_OFFSET : 0

	return (
		<button
			style={{
				position: 'absolute',
				width: HANDLE_SIZE * 2,
				height: HANDLE_SIZE * 2,
				pointerEvents: 'all',
				border: 'none',
				backgroundColor: 'transparent',
				padding: '0',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				cursor: 'pointer',
				transform: `translate(${x}px, ${y}px) rotate(${rotation}rad)`,
			}}
			onPointerDown={(e) => {
				stopEventPropagation(e)
				const noteId = createShapeId()
				editor.createShapes([
					{ type: 'note', id: noteId, x: shape.x + offsetX, y: shape.y + offsetY },
				])
				const newNote = editor.getShape(noteId)
			}}
		>
			<div
				style={{
					height: HANDLE_SIZE,
					width: HANDLE_SIZE,
					borderRadius: '10px',
					border: '2px solid blue',
					padding: '0',
				}}
			></div>
		</button>
	)
}
