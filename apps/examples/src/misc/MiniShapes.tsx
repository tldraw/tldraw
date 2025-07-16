import { nearestMultiple } from '@tldraw/editor/src/lib/utils/nearestMultiple'
import { react } from '@tldraw/state'
import { compact } from 'lodash'
import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import {
	Box,
	Mat,
	ShapeUtil,
	TLShape,
	TLShapeId,
	useEditor,
	useQuickReactor,
	useStateTracking,
	useValue,
} from 'tldraw'

function setStyleProperty(el: HTMLElement | null, prop: string, value: string | number) {
	if (!el) return
	el.style.setProperty(prop, String(value))
}
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
	a.props === b.props && a.meta === b.meta

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

	if (!shape) return null

	return (
		<>
			{/* eslint-disable-next-line local/no-at-internal */}
			{util.backgroundComponent && (
				<div ref={bgContainerRef} className="tl-shape tl-shape-background" draggable={false}>
					<InnerShapeBackground shape={shape} util={util} />
				</div>
			)}
			<div ref={containerRef} className="tl-shape" draggable={false}>
				<InnerShape shape={shape} util={util} />
			</div>
		</>
	)
})

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
				// eslint-disable-next-line local/no-at-internal
				util.backgroundComponent?.(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
			[util, shape.id]
		)
	},
	(prev, next) =>
		prev.shape.props === next.shape.props &&
		prev.shape.meta === next.shape.meta &&
		prev.util === next.util
)

export function MiniShapes({
	ids,
	width,
	height,
}: {
	ids: TLShapeId[]
	width: number
	height: number
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const editor = useEditor()
	const renderingShapes = useValue(
		'rendering shapes',
		() => {
			const idsAncChildIds = editor.getShapeAndDescendantIds(ids)
			return editor.getRenderingShapes().filter((s) => idsAncChildIds.has(s.id))
		},
		[editor, ids]
	)

	const transform = useValue(
		'transform',
		() => {
			const sharedBounds = Box.Common(compact(ids.map((id) => editor.getShapePageBounds(id))))
			// grow the bounds so that the aspect ratio matches width / height, keeping the center the same
			// then that becomes the viewport
			const aspectRatio = width / height

			// Calculate the current bounds aspect ratio
			const currentAspectRatio = sharedBounds.w / sharedBounds.h

			const center = sharedBounds.center.clone()

			if (currentAspectRatio > aspectRatio) {
				// Current bounds are wider than target - grow height
				sharedBounds.h = sharedBounds.w / aspectRatio
			} else if (currentAspectRatio < aspectRatio) {
				// Current bounds are taller than target - grow width
				sharedBounds.w = sharedBounds.h * aspectRatio
			}
			sharedBounds.center = center

			// return transform that converts the shared bounds to 0,0,width,height
			return Mat.toCssString(
				Mat.Compose(
					Mat.Scale(width / sharedBounds.w, height / sharedBounds.h),
					Mat.Translate(-sharedBounds.x, -sharedBounds.y)
				)
			)
		},
		[editor, ids, width, height]
	)

	const dprMultiple = useValue(
		'dpr multiple',
		() =>
			// dprMultiple is the smallest number we can multiply dpr by to get an integer
			// it's usually 1, 2, or 4 (for e.g. dpr of 2, 2.5 and 2.25 respectively)
			nearestMultiple(Math.floor(editor.getInstanceState().devicePixelRatio * 100) / 100),
		[editor]
	)

	return (
		<>
			<button
				onClick={() => {
					const node = containerRef.current!.cloneNode(true)! as HTMLDivElement

					containerRef.current?.parentElement?.appendChild(node)
					node.style.setProperty('top', 50 + height + 25 + 'px')
				}}
				style={{
					position: 'fixed',
					width: 15,
					height: 15,
					top: 50 + height + 1,
					left: 50,
					outline: '1px solid red',
					background: 'none',
					border: 'none',
					padding: 0,
					margin: 0,
					fontSize: 10,
				}}
			>
				↓
			</button>
			<div
				ref={containerRef}
				style={{ width, height, position: 'fixed', top: 50, left: 50, outline: '1px solid red' }}
			>
				<div style={{ transform, position: 'absolute' }}>
					{renderingShapes.map((shape) => (
						<Shape
							key={shape.id}
							id={shape.id}
							shape={shape.shape}
							util={shape.util}
							index={shape.index}
							backgroundIndex={shape.backgroundIndex}
							opacity={shape.opacity}
							dprMultiple={dprMultiple}
						/>
					))}
				</div>
			</div>
		</>
	)
}
