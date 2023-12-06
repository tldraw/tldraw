import { track, useQuickReactor, useStateTracking } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import * as React from 'react'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { nearestMultiple } from '../hooks/useDPRMultiple'
import { useEditor } from '../hooks/useEditor'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { Matrix2d } from '../primitives/Matrix2d'
import { toDomPrecision } from '../primitives/utils'
import { OptionalErrorBoundary } from './ErrorBoundary'

/*
This component renders shapes on the canvas. There are two stages: positioning
and styling the shape's container using CSS, and then rendering the shape's 
JSX using its shape util's render method. Rendering the "inside" of a shape is
more expensive than positioning it or changing its color, so we use React.memo
to wrap the inner shape and only re-render it when the shape's props change. 

The shape also receives props for its index and opacity. The index is used to
determine the z-index of the shape, and the opacity is used to set the shape's
opacity based on its own opacity and that of its parent's.
*/
export const Shape = track(function Shape({
	id,
	shape,
	util,
	index,
	backgroundIndex,
	opacity,
	isCulled,
}: {
	id: TLShapeId
	shape: TLShape
	util: ShapeUtil
	index: number
	backgroundIndex: number
	opacity: number
	isCulled: boolean
}) {
	const editor = useEditor()

	const { ShapeErrorFallback } = useEditorComponents()

	const containerRef = React.useRef<HTMLDivElement>(null)
	const backgroundContainerRef = React.useRef<HTMLDivElement>(null)

	const setProperty = React.useCallback((property: string, value: string) => {
		containerRef.current?.style.setProperty(property, value)
		backgroundContainerRef.current?.style.setProperty(property, value)
	}, [])

	useQuickReactor(
		'set shape container transform position',
		() => {
			const shape = editor.getShape(id)
			if (!shape) return // probably the shape was just deleted

			const pageTransform = editor.getShapePageTransform(id)
			const transform = Matrix2d.toCssString(pageTransform)
			setProperty('transform', transform)
		},
		[editor, setProperty]
	)

	useQuickReactor(
		'set shape container clip path',
		() => {
			const shape = editor.getShape(id)
			if (!shape) return null

			const clipPath = editor.getShapeClipPath(id)
			setProperty('clip-path', clipPath ?? 'none')
		},
		[editor, setProperty]
	)

	useQuickReactor(
		'set shape height and width',
		() => {
			const shape = editor.getShape(id)
			if (!shape) return null

			const bounds = editor.getShapeGeometry(shape).bounds
			const dpr = Math.floor(editor.getInstanceState().devicePixelRatio * 100) / 100
			// dprMultiple is the smallest number we can multiply dpr by to get an integer
			// it's usually 1, 2, or 4 (for e.g. dpr of 2, 2.5 and 2.25 respectively)
			const dprMultiple = nearestMultiple(dpr)
			// We round the shape width and height up to the nearest multiple of dprMultiple to avoid the browser
			// making miscalculations when applying the transform.
			const widthRemainder = bounds.w % dprMultiple
			const width = widthRemainder === 0 ? bounds.w : bounds.w + (dprMultiple - widthRemainder)
			const heightRemainder = bounds.h % dprMultiple
			const height = heightRemainder === 0 ? bounds.h : bounds.h + (dprMultiple - heightRemainder)
			setProperty('width', Math.max(width, dprMultiple) + 'px')
			setProperty('height', Math.max(height, dprMultiple) + 'px')
		},
		[editor]
	)

	// Set the opacity of the container when the opacity changes
	React.useLayoutEffect(() => {
		setProperty('opacity', opacity + '')
		containerRef.current?.style.setProperty('z-index', index + '')
		backgroundContainerRef.current?.style.setProperty('z-index', backgroundIndex + '')
	}, [opacity, index, backgroundIndex, setProperty])

	const annotateError = React.useCallback(
		(error: any) => {
			editor.annotateError(error, { origin: 'react.shape', willCrashApp: false })
		},
		[editor]
	)

	if (!shape) return null

	return (
		<>
			{util.backgroundComponent && (
				<div
					ref={backgroundContainerRef}
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
			<div ref={containerRef} className="tl-shape" data-shape-type={shape.type} draggable={false}>
				{isCulled ? (
					<CulledShape shape={shape} />
				) : (
					<OptionalErrorBoundary fallback={ShapeErrorFallback as any} onError={annotateError}>
						<InnerShape shape={shape} util={util} />
					</OptionalErrorBoundary>
				)}
			</div>
		</>
	)
})

const InnerShape = React.memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
		return useStateTracking('InnerShape:' + shape.type, () => util.component(shape))
	},
	(prev, next) =>
		prev.shape.props === next.shape.props &&
		prev.shape.meta === next.shape.meta &&
		prev.util === next.util
)

const InnerShapeBackground = React.memo(
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

const CulledShape = React.memo(
	function CulledShape<T extends TLShape>({ shape }: { shape: T }) {
		const editor = useEditor()
		const bounds = editor.getShapeGeometry(shape).bounds

		return (
			<div
				className="tl-shape__culled"
				style={{
					transform: `translate(${toDomPrecision(bounds.minX)}px, ${toDomPrecision(
						bounds.minY
					)}px)`,
					width: Math.max(1, toDomPrecision(bounds.width)),
					height: Math.max(1, toDomPrecision(bounds.height)),
				}}
			/>
		)
	},
	() => true
)
