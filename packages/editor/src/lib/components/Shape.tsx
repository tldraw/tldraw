import { react } from '@tldraw/state'
import { useQuickReactor, useStateTracking } from '@tldraw/state-react'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { Editor } from '../editor/Editor'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { useEditorComponents } from '../hooks/EditorComponentsContext'
import { useEditor } from '../hooks/useEditor'
import { useShapeCulling } from '../hooks/useShapeCulling'
import { Mat } from '../primitives/Mat'
import { areShapesContentEqual } from '../utils/areShapesContentEqual'
import { setStyleProperty } from '../utils/dom'
import { OptionalErrorBoundary } from './ErrorBoundary'

/*
This component renders shapes on the canvas. There are two stages: positioning
and styling the shape's container using CSS, and then rendering the shape's 
JSX using its shape util's render method. Rendering the "inside" of a shape is
more expensive than positioning it or changing its color, so we use memo
to wrap the inner shape and only re-render it when the shape's props change. 

The shape also receives props for its index and opacity. The index is used to
determine the z-index of the shape, and the opacity is used to set the shape's
opacity based on its own opacity and that of its parent's.
*/
export const Shape = memo(function Shape({
	id,
	shape,
	util,
	index,
	backgroundIndex,
	opacity,
}: {
	id: TLShapeId
	shape: TLShape
	util: ShapeUtil
	index: number
	backgroundIndex: number
	opacity: number
}) {
	const editor = useEditor()

	const { ShapeErrorFallback, ShapeWrapper } = useEditorComponents()

	const containerRef = useRef<HTMLDivElement>(null)
	const bgContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		return react('load fonts', () => {
			const fonts = editor.fonts.getShapeFontFaces(id)
			editor.fonts.requestFonts(fonts)
		})
	}, [editor, id])

	const memoizedStuffRef = useRef({
		transform: '',
		clipPath: 'none',
		width: 0,
		height: 0,
		x: 0,
		y: 0,
	})

	useQuickReactor(
		'set shape stuff',
		() => {
			const shape = editor.getShape(id)
			if (!shape) return // probably the shape was just deleted

			const prev = memoizedStuffRef.current

			// Clip path
			const clipPath = editor.getShapeClipPath(id) ?? 'none'
			if (clipPath !== prev.clipPath) {
				setStyleProperty(containerRef.current, 'clip-path', clipPath)
				setStyleProperty(bgContainerRef.current, 'clip-path', clipPath)
				prev.clipPath = clipPath
			}

			// Page transform
			const pageTransform = editor.getShapePageTransform(id)
			const transform = Mat.toCssString(pageTransform)
			const bounds = editor.getShapeGeometry(shape).bounds

			// Update if the tranform has changed
			if (transform !== prev.transform) {
				setStyleProperty(containerRef.current, 'transform', transform)
				setStyleProperty(bgContainerRef.current, 'transform', transform)
				prev.transform = transform
			}

			// Width / Height
			const width = Math.max(bounds.width, 1)
			const height = Math.max(bounds.height, 1)

			if (width !== prev.width || height !== prev.height) {
				setStyleProperty(containerRef.current, 'width', width + 'px')
				setStyleProperty(containerRef.current, 'height', height + 'px')
				setStyleProperty(bgContainerRef.current, 'width', width + 'px')
				setStyleProperty(bgContainerRef.current, 'height', height + 'px')
				prev.width = width
				prev.height = height
			}
		},
		[editor]
	)

	// This stuff changes pretty infrequently, so we can change them together
	useLayoutEffect(() => {
		const container = containerRef.current
		const bgContainer = bgContainerRef.current

		// Opacity
		setStyleProperty(container, 'opacity', opacity)
		setStyleProperty(bgContainer, 'opacity', opacity)

		// Z-Index
		setStyleProperty(container, 'z-index', index)
		setStyleProperty(bgContainer, 'z-index', backgroundIndex)
	}, [opacity, index, backgroundIndex])

	// Register container refs with the centralized culling context.
	// This runs on mount and handles initial display state.
	const { register, unregister } = useShapeCulling()
	useLayoutEffect(() => {
		const container = containerRef.current
		if (!container) return

		// Check initial culling state and register with the context
		const isCulled = editor.getCulledShapes().has(id)
		register(id, container, bgContainerRef.current, isCulled)

		return () => {
			unregister(id)
		}
	}, [editor, id, register, unregister])
	const annotateError = useCallback(
		(error: any) => editor.annotateError(error, { origin: 'shape', willCrashApp: false }),
		[editor]
	)

	if (!shape || !ShapeWrapper) return null

	return (
		<>
			{util.backgroundComponent && (
				<ShapeWrapper ref={bgContainerRef} shape={shape} isBackground={true}>
					<OptionalErrorBoundary fallback={ShapeErrorFallback} onError={annotateError}>
						<InnerShapeBackground shape={shape} util={util} />
					</OptionalErrorBoundary>
				</ShapeWrapper>
			)}
			<ShapeWrapper ref={containerRef} shape={shape} isBackground={false}>
				<OptionalErrorBoundary fallback={ShapeErrorFallback as any} onError={annotateError}>
					<InnerShape shape={shape} util={util} />
				</OptionalErrorBoundary>
				{util.getAppOwnedElement && <ContentElementSlot id={id} util={util} />}
			</ShapeWrapper>
		</>
	)
})

/*
The content element slot hosts an app-owned element provided by the shape util's
getContentElement method. The contract: while the shape is mounted, tldraw never
unmounts, recreates, or relocates the element (the canvas renders shapes in stable
id-sorted DOM order, so reorders and reparenting never move DOM nodes), and before
the slot is destroyed — shape deletion, page change, error teardown, or the whole
editor unmounting — onReleaseContentElement is called while the slot is still
connected to the document, so the app can move the element to a new parent with
Node.moveBefore without resetting its state. That last guarantee relies on this
being a layout effect: React runs layout effect cleanups before it detaches the
host nodes of a deleted subtree, which is not true of passive effects.
*/
const ContentElementSlot = memo(function ContentElementSlot({
	id,
	util,
}: {
	id: TLShapeId
	util: ShapeUtil
}) {
	const editor = useEditor()
	const slotRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const slot = slotRef.current
		if (!slot) return

		const shape = editor.getShape(id)
		if (!shape) return

		const element = util.getAppOwnedElement?.(shape)
		if (!element) return

		// An element that was connected before adoption (e.g. parked off-canvas by the
		// app between editor sessions) should survive the move without reloading.
		const wasConnectedBeforeAdoption = element.isConnected

		if (element.parentNode !== slot) {
			moveElementInto(slot, element)
		}

		if (process.env.NODE_ENV !== 'production' && wasConnectedBeforeAdoption) {
			warnIfContentElementReloads(editor, slot, element)
		}

		return () => {
			const latestShape = editor.getShape(id) ?? shape
			util.onReleaseAppOwnedElement?.(latestShape, element)
			if (process.env.NODE_ENV !== 'production' && element.parentNode === slot) {
				console.warn(
					`[tldraw] The content element for shape "${id}" was not reclaimed by onReleaseContentElement and will be destroyed along with its slot, losing any state it holds.`
				)
			}
		}
	}, [editor, id, util])

	return <div ref={slotRef} className="tl-content-slot" draggable={false} />
})

function moveElementInto(parent: HTMLElement, element: HTMLElement) {
	// Node.moveBefore (Chromium 133+, Firefox 144+) preserves iframe and media state
	// across the move; it requires both nodes to be connected to the same document.
	if (
		element.isConnected &&
		parent.isConnected &&
		typeof (parent as any).moveBefore === 'function' &&
		element.ownerDocument === parent.ownerDocument
	) {
		try {
			;(parent as any).moveBefore(element, null)
			return
		} catch {
			// fall through to appendChild
		}
	}
	parent.appendChild(element)
}

// Dev-mode assertion that adoption kept the platform's state-preservation promise: a
// load event firing on a previously-connected adopted element means the embed reloaded.
// load doesn't bubble, but capture-phase listeners on ancestors still observe it.
function warnIfContentElementReloads(editor: Editor, slot: HTMLElement, element: HTMLElement) {
	const onLoad = (event: Event) => {
		if (event.target !== element && !element.contains(event.target as Node)) return
		console.warn(
			'[tldraw] A load event fired on an adopted content element. The element reloaded when it was moved into the shape, losing its state. State-preserving moves need Node.moveBefore (Chromium 133+, Firefox 144+) and a continuously connected element.'
		)
	}
	slot.addEventListener('load', onLoad, { capture: true })
	editor.timers.setTimeout(() => slot.removeEventListener('load', onLoad, { capture: true }), 1000)
}

export const InnerShape = memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking(
			'InnerShape:' + shape.type,
			() =>
				// always fetch the latest shape from the store even if the props/meta have not changed, to avoid
				// calling the render method with stale data.
				util.component(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) => areShapesContentEqual(prev.shape, next.shape) && prev.util === next.util
)

export const InnerShapeBackground = memo(
	function InnerShapeBackground<T extends TLShape>({
		shape,
		util,
	}: {
		shape: T
		util: ShapeUtil<T>
	}) {
		return useStateTracking(
			'InnerShape:' + shape.type,
			() =>
				// always fetch the latest shape from the store even if the props/meta have not changed, to avoid
				// calling the render method with stale data.
				util.backgroundComponent?.(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) =>
		prev.shape.props === next.shape.props &&
		prev.shape.meta === next.shape.meta &&
		prev.util === next.util
)
