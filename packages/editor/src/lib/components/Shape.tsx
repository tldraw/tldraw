import { Matrix2d } from '@tldraw/primitives'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import * as React from 'react'
import {
	track,
	// @ts-expect-error 'private' export
	useStateTracking,
} from 'signia-react'
import { useApp } from '../..'
import { TLShapeUtil } from '../app/shapeutils/TLShapeUtil'
import { useEditorComponents } from '../hooks/useEditorComponents'
import { useQuickReactor } from '../hooks/useQuickReactor'
import { useShapeEvents } from '../hooks/useShapeEvents'
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
	index,
	opacity,
	isCulled,
}: {
	id: TLShapeId
	index: number
	opacity: number
	isCulled: boolean
}) {
	const app = useApp()

	const { ShapeErrorFallback } = useEditorComponents()

	const events = useShapeEvents(id)

	const rContainer = React.useRef<HTMLDivElement>(null)

	useQuickReactor(
		'set shape container transform position',
		() => {
			const elm = rContainer.current
			if (!elm) return

			const shape = app.getShapeById(id)
			const pageTransform = app.getPageTransformById(id)

			if (!shape || !pageTransform) return null

			const transform = Matrix2d.toCssString(pageTransform)
			elm.style.setProperty('transform', transform)
		},
		[app]
	)

	useQuickReactor(
		'set shape container clip path / color',
		() => {
			const elm = rContainer.current
			const shape = app.getShapeById(id)
			if (!elm) return
			if (!shape) return null

			const clipPath = app.getClipPathById(id)
			elm.style.setProperty('clip-path', clipPath ?? 'none')
			if ('color' in shape.props) {
				elm.style.setProperty('color', app.getCssColor(shape.props.color))
			}
		},
		[app]
	)

	useQuickReactor(
		'set shape height and width',
		() => {
			const elm = rContainer.current
			const shape = app.getShapeById(id)
			if (!elm) return
			if (!shape) return null

			const util = app.getShapeUtil(shape)
			const bounds = util.bounds(shape)
			elm.style.setProperty('width', Math.ceil(bounds.width) + 'px')
			elm.style.setProperty('height', Math.ceil(bounds.height) + 'px')
		},
		[app]
	)

	// Set the opacity of the container when the opacity changes
	React.useLayoutEffect(() => {
		const elm = rContainer.current
		if (!elm) return
		elm.style.setProperty('opacity', opacity + '')
		elm.style.setProperty('z-index', index + '')
	}, [opacity, index])

	const shape = app.getShapeById(id)

	if (!shape) return null

	const util = app.getShapeUtil(shape)

	return (
		<div
			key={id}
			ref={rContainer}
			className="rs-shape"
			data-shape-type={shape.type}
			draggable={false}
			onPointerDown={events.onPointerDown}
			onPointerMove={events.onPointerMove}
			onPointerUp={events.onPointerUp}
			onPointerEnter={events.onPointerEnter}
			onPointerLeave={events.onPointerLeave}
		>
			{isCulled && util.canUnmount(shape) ? (
				<CulledShape shape={shape} util={util} />
			) : (
				<OptionalErrorBoundary
					fallback={ShapeErrorFallback ? (error) => <ShapeErrorFallback error={error} /> : null}
					onError={(error) =>
						app.annotateError(error, { origin: 'react.shape', willCrashApp: false })
					}
				>
					<InnerShape shape={shape} util={util} />
				</OptionalErrorBoundary>
			)}
		</div>
	)
})

const InnerShape = React.memo(
	function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: TLShapeUtil<T> }) {
		return useStateTracking('InnerShape:' + util.type, () => util.render(shape))
	},
	(prev, next) => prev.shape.props === next.shape.props
)

const CulledShape = React.memo(
	function CulledShap<T extends TLShape>({ shape, util }: { shape: T; util: TLShapeUtil<T> }) {
		const bounds = util.bounds(shape)
		return (
			<div
				className="rs-shape__culled"
				style={{
					transform: `translate(${bounds.minX}px, ${bounds.minY}px)`,
					width: bounds.width,
					height: bounds.height,
				}}
			/>
		)
	},
	() => true
)
