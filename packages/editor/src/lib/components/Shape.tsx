import { useLayoutReaction, useStateTracking } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { memo, useCallback, useLayoutEffect, useRef } from 'react'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { useEditor } from '../hooks/useEditor'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { Mat } from '../primitives/Mat'
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

	useLayoutReaction('set shape stuff', () => {
		const shape = editor.getShape(id)
		if (!shape) return // probably the shape was just deleted

		// Clip path
		const clipPath = editor.getShapeClipPath(id)
		setProperty(containerRef, 'clip-path', clipPath ?? 'none')
		setProperty(bgContainerRef, 'clip-path', clipPath ?? 'none')

		// Page transform
		const pageTransform = editor.getShapePageTransform(id)
		const transform = Mat.toCssString(pageTransform)
		setProperty(containerRef, 'transform', transform)
		setProperty(bgContainerRef, 'transform', transform)

		// Width / Height
		// We round the shape width and height up to the nearest multiple of dprMultiple to avoid the browser
		// making miscalculations when applying the transform.
		const bounds = editor.getShapeGeometry(shape).bounds
		const widthRemainder = bounds.w % dprMultiple
		const width = widthRemainder === 0 ? bounds.w : bounds.w + (dprMultiple - widthRemainder)
		const heightRemainder = bounds.h % dprMultiple
		const height = heightRemainder === 0 ? bounds.h : bounds.h + (dprMultiple - heightRemainder)
		setProperty(containerRef, 'width', Math.max(width, dprMultiple) + 'px')
		setProperty(containerRef, 'height', Math.max(height, dprMultiple) + 'px')
		setProperty(bgContainerRef, 'width', Math.max(width, dprMultiple) + 'px')
		setProperty(bgContainerRef, 'height', Math.max(height, dprMultiple) + 'px')
	})

	// Set the opacity of the container when the opacity changes
	useLayoutEffect(() => {
		// Opacity
		setProperty(containerRef, 'opacity', opacity)
		setProperty(bgContainerRef, 'opacity', opacity)

		// Z-Index
		setProperty(containerRef, 'z-index', index)
		setProperty(bgContainerRef, 'z-index', backgroundIndex)
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
					{!isCulled && (
						<OptionalErrorBoundary fallback={ShapeErrorFallback} onError={annotateError}>
							<InnerShapeBackground shape={shape} util={util} />
						</OptionalErrorBoundary>
					)}
				</div>
			)}
			<div
				ref={containerRef}
				className={classNames('tl-shape', { 'tl-shape__culled': isCulled })}
				data-shape-type={shape.type}
				draggable={false}
			>
				{!isCulled && (
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
	// Only update when the shape's props or meta change
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
	// Only update when the shape's props or meta change
	(prev, next) => prev.shape.props === next.shape.props && prev.shape.meta === next.shape.meta
)
