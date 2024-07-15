import { useQuickReactor, useStateTracking } from '@tldraw/state-react'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { memo, useCallback, useRef } from 'react'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { useEditor } from '../hooks/useEditor'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { Mat } from '../primitives/Mat'
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
	dprMultiple,
}: {
	id: TLShapeId
	shape: TLShape
	util: ShapeUtil
	index: number
	backgroundIndex: number
	opacity: number
	dprMultiple: number
}) {
	const editor = useEditor()

	const { ShapeErrorFallback } = useEditorComponents()

	const containerRef = useRef<HTMLDivElement>(null)
	const bgContainerRef = useRef<HTMLDivElement>(null)

	const memoizedStuffRef = useRef({
		transform: '',
		clipPath: 'none',
		width: 0,
		height: 0,
		x: 0,
		y: 0,
		isCulled: false,
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
			// We round the shape width and height up to the nearest multiple of dprMultiple
			// to avoid the browser making miscalculations when applying the transform.
			const widthRemainder = bounds.w % dprMultiple
			const heightRemainder = bounds.h % dprMultiple
			const width = widthRemainder === 0 ? bounds.w : bounds.w + (dprMultiple - widthRemainder)
			const height = heightRemainder === 0 ? bounds.h : bounds.h + (dprMultiple - heightRemainder)

			if (width !== prev.width || height !== prev.height) {
				setStyleProperty(containerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
				setStyleProperty(containerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
				setStyleProperty(bgContainerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
				setStyleProperty(bgContainerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
				prev.width = width
				prev.height = height
			}
		},
		[editor]
	)

	// This stuff changes pretty infrequently, so we can change them together
	useQuickReactor(
		'set opacity and z-index',
		() => {
			const container = containerRef.current
			const bgContainer = bgContainerRef.current

			// Opacity
			setStyleProperty(container, 'opacity', opacity)
			setStyleProperty(bgContainer, 'opacity', opacity)

			// Z-Index
			setStyleProperty(container, 'z-index', index)
			setStyleProperty(bgContainer, 'z-index', backgroundIndex)
		},
		[opacity, index, backgroundIndex]
	)

	useQuickReactor(
		'set display',
		() => {
			const shape = editor.getShape(id)
			if (!shape) return // probably the shape was just deleted

			const culledShapes = editor.getCulledShapes()
			const isCulled = culledShapes.has(id)
			if (isCulled !== memoizedStuffRef.current.isCulled) {
				setStyleProperty(containerRef.current, 'display', isCulled ? 'none' : 'block')
				setStyleProperty(bgContainerRef.current, 'display', isCulled ? 'none' : 'block')
				memoizedStuffRef.current.isCulled = isCulled
			}
		},
		[editor]
	)
	const annotateError = useCallback(
		(error: any) => editor.annotateError(error, { origin: 'shape', willCrashApp: false }),
		[editor]
	)

	if (!shape) return null

	const isFilledShape = 'fill' in shape.props && shape.props.fill !== 'none'

	return (
		<>
			{util.backgroundComponent && (
				<div
					ref={bgContainerRef}
					className="tl-shape tl-shape-background"
					data-shape-type={shape.type}
					draggable={false}
				>
					<OptionalErrorBoundary fallback={ShapeErrorFallback} onError={annotateError}>
						<InnerShapeBackground shape={shape} util={util} />
					</OptionalErrorBoundary>
				</div>
			)}
			<div
				ref={containerRef}
				className="tl-shape"
				data-shape-type={shape.type}
				data-shape-is-filled={isFilledShape}
				draggable={false}
			>
				<OptionalErrorBoundary fallback={ShapeErrorFallback as any} onError={annotateError}>
					<InnerShape shape={shape} util={util} />
				</OptionalErrorBoundary>
			</div>
		</>
	)
})

const InnerShape = memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking('InnerShape:' + shape.type, () =>
			// always fetch the latest shape from the store even if the props/meta have not changed, to avoid
			// calling the render method with stale data.
			util.component(util.editor.store.unsafeGetWithoutCapture(shape.id) as T)
		)
	},
	(prev, next) => prev.shape.props === next.shape.props && prev.shape.meta === next.shape.meta
)

const InnerShapeBackground = memo(
	function InnerShapeBackground<T extends TLShape>({
		shape,
		util,
	}: {
		shape: T
		util: ShapeUtil<T>
	}) {
		return useStateTracking('InnerShape:' + shape.type, () =>
			// always fetch the latest shape from the store even if the props/meta have not changed, to avoid
			// calling the render method with stale data.
			util.backgroundComponent?.(util.editor.store.unsafeGetWithoutCapture(shape.id) as T)
		)
	},
	(prev, next) => prev.shape.props === next.shape.props && prev.shape.meta === next.shape.meta
)
