import { useLayoutReaction, useStateTracking } from '@tldraw/state'
import { IdOf } from '@tldraw/store'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { memo, useCallback, useLayoutEffect, useRef } from 'react'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { useEditor } from '../hooks/useEditor'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { Mat } from '../primitives/Mat'
import { toDomPrecision } from '../primitives/utils'
import { setProperty } from '../utils/dom'
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
	isCulled,
	dprMultiple,
}: {
	id: TLShapeId
	shape: TLShape
	util: ShapeUtil
	index: number
	backgroundIndex: number
	opacity: number
	isCulled: boolean
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
	})

	useLayoutReaction('set shape stuff', () => {
		const shape = editor.getShape(id)
		if (!shape) return // probably the shape was just deleted

		const prev = memoizedStuffRef.current

		// Clip path
		const clipPath = editor.getShapeClipPath(id) ?? 'none'
		if (clipPath !== prev.clipPath) {
			setProperty(containerRef.current, 'clip-path', clipPath)
			setProperty(bgContainerRef.current, 'clip-path', clipPath)
			prev.clipPath = clipPath
		}

		// Page transform
		const transform = Mat.toCssString(editor.getShapePageTransform(id))
		if (transform !== prev.transform) {
			setProperty(containerRef.current, 'transform', transform)
			setProperty(bgContainerRef.current, 'transform', transform)
			prev.transform = transform
		}

		// Width / Height
		// We round the shape width and height up to the nearest multiple of dprMultiple
		// to avoid the browser making miscalculations when applying the transform.
		const bounds = editor.getShapeGeometry(shape).bounds
		const widthRemainder = bounds.w % dprMultiple
		const heightRemainder = bounds.h % dprMultiple
		const width = widthRemainder === 0 ? bounds.w : bounds.w + (dprMultiple - widthRemainder)
		const height = heightRemainder === 0 ? bounds.h : bounds.h + (dprMultiple - heightRemainder)

		if (width !== prev.width || height !== prev.height) {
			setProperty(containerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
			setProperty(containerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
			setProperty(bgContainerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
			setProperty(bgContainerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
			prev.width = width
			prev.height = height
		}
	})

	// This stuff changes pretty infrequently, so we can change them together
	useLayoutEffect(() => {
		const container = containerRef.current
		const bgContainer = bgContainerRef.current

		// Opacity
		setProperty(container, 'opacity', opacity)
		setProperty(bgContainer, 'opacity', opacity)

		// Z-Index
		setProperty(container, 'z-index', index)
		setProperty(bgContainer, 'z-index', backgroundIndex)
	}, [opacity, index, backgroundIndex])

	const annotateError = useCallback(
		(error: any) => editor.annotateError(error, { origin: 'shape', willCrashApp: false }),
		[editor]
	)

	if (!shape) return null

	return (
		<>
			{util.backgroundComponent && (
				<div
					ref={bgContainerRef}
					className="tl-shape tl-shape-background"
					data-shape-type={shape.type}
					draggable={false}
				>
					{isCulled ? null : (
						<OptionalErrorBoundary fallback={ShapeErrorFallback} onError={annotateError}>
							<InnerShapeBackground shape={shape} util={util} />
						</OptionalErrorBoundary>
					)}
				</div>
			)}
			<div ref={containerRef} className="tl-shape" data-shape-type={shape.type} draggable={false}>
				{isCulled ? (
					<CulledShape shapeId={shape.id} />
				) : (
					<OptionalErrorBoundary fallback={ShapeErrorFallback as any} onError={annotateError}>
						<InnerShape shape={shape} util={util} />
					</OptionalErrorBoundary>
				)}
			</div>
		</>
	)
})

const InnerShape = memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking('InnerShape:' + shape.type, () => util.component(shape))
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
		return useStateTracking('InnerShape:' + shape.type, () => util.backgroundComponent?.(shape))
	},
	(prev, next) => prev.shape.props === next.shape.props && prev.shape.meta === next.shape.meta
)

const CulledShape = function CulledShape<T extends TLShape>({ shapeId }: { shapeId: IdOf<T> }) {
	const editor = useEditor()
	const culledRef = useRef<HTMLDivElement>(null)

	useLayoutReaction('set shape stuff', () => {
		const bounds = editor.getShapeGeometry(shapeId).bounds
		setProperty(
			culledRef.current,
			'transform',
			`translate(${toDomPrecision(bounds.minX)}px, ${toDomPrecision(bounds.minY)}px)`
		)
	})

	return <div ref={culledRef} className="tl-shape__culled" />
}
