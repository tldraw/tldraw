import { useLayoutEffect, useRef } from 'react'
import {
	HTMLContainer,
	IndexKey,
	Rectangle2d,
	ShapeUtil,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
} from 'tldraw'
import { drawCoralReef, getCoralBounds } from './coral-renderer'
import { CORAL_TYPE, CoralShape, coralShapeProps } from './coral-shape-types'

// [1]
export class CoralShapeUtil extends ShapeUtil<CoralShape> {
	static override type = CORAL_TYPE
	static override props = coralShapeProps

	override getDefaultProps(): CoralShape['props'] {
		return {
			basePath: [
				{ x: 0, y: 40 },
				{ x: 30, y: 0 },
				{ x: 70, y: 0 },
				{ x: 100, y: 40 },
				{ x: 80, y: 80 },
				{ x: 20, y: 80 },
			],
			pullVector: { x: 0, y: -200 },
		}
	}

	// [2]
	override getGeometry(shape: CoralShape) {
		const bounds = getCoralBounds(shape.props.basePath, shape.props.pullVector)
		return new Rectangle2d({
			x: bounds.minX,
			y: bounds.minY,
			width: bounds.maxX - bounds.minX,
			height: bounds.maxY - bounds.minY,
			isFilled: true,
		})
	}

	// [3]
	override getHandles(shape: CoralShape): TLHandle[] {
		// Display the handle at 1/SENSITIVITY of the actual pullVector
		// so the handle stays close to the shape while the effect is amplified
		const SENSITIVITY = 3.5
		return [
			{
				id: 'pull',
				type: 'vertex' as const,
				x: shape.props.pullVector.x / SENSITIVITY,
				y: shape.props.pullVector.y / SENSITIVITY,
				index: 'a1' as IndexKey,
			},
		]
	}

	// [3b]
	override onHandleDrag(shape: CoralShape, { handle }: TLHandleDragInfo<CoralShape>) {
		// Amplify the handle position so small drags produce large growth
		const SENSITIVITY = 3.5
		return {
			id: shape.id,
			type: CORAL_TYPE,
			props: {
				pullVector: { x: handle.x * SENSITIVITY, y: handle.y * SENSITIVITY },
			},
		}
	}

	// [4]
	override onResize(shape: CoralShape, info: TLResizeInfo<CoralShape>) {
		const { scaleX, scaleY } = info
		return {
			props: {
				basePath: shape.props.basePath.map((p) => ({
					x: p.x * scaleX,
					y: p.y * scaleY,
				})),
				pullVector: {
					x: shape.props.pullVector.x * scaleX,
					y: shape.props.pullVector.y * scaleY,
				},
			},
		}
	}

	override canResize() {
		return true
	}

	// [5]
	override component(shape: CoralShape) {
		const canvasRef = useRef<HTMLCanvasElement>(null)
		const bounds = getCoralBounds(shape.props.basePath, shape.props.pullVector)
		const width = bounds.maxX - bounds.minX
		const height = bounds.maxY - bounds.minY

		useLayoutEffect(() => {
			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext('2d')
			if (!ctx) return

			const dpr = window.devicePixelRatio || 1
			canvas.width = width * dpr
			canvas.height = height * dpr
			ctx.scale(dpr, dpr)

			ctx.clearRect(0, 0, width, height)

			const offsetX = -bounds.minX
			const offsetY = -bounds.minY

			drawCoralReef(ctx, shape.props.basePath, shape.props.pullVector, offsetX, offsetY)
		}, [shape.props.basePath, shape.props.pullVector, bounds.minX, bounds.minY, width, height])

		return (
			<HTMLContainer
				style={{
					position: 'relative',
					left: bounds.minX,
					top: bounds.minY,
					width,
					height,
				}}
			>
				<canvas ref={canvasRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
			</HTMLContainer>
		)
	}

	// [6]
	override indicator(shape: CoralShape) {
		const bounds = getCoralBounds(shape.props.basePath, shape.props.pullVector)
		return (
			<rect
				x={bounds.minX}
				y={bounds.minY}
				width={bounds.maxX - bounds.minX}
				height={bounds.maxY - bounds.minY}
				rx={4}
				ry={4}
			/>
		)
	}

	override hideSelectionBoundsBg(shape: CoralShape) {
		return this.editor.getEditingShapeId() === shape.id
	}

	override hideSelectionBoundsFg(shape: CoralShape) {
		return this.editor.getEditingShapeId() === shape.id
	}

	override toSvg(shape: CoralShape) {
		const bounds = getCoralBounds(shape.props.basePath, shape.props.pullVector)
		const width = bounds.maxX - bounds.minX
		const height = bounds.maxY - bounds.minY

		return (
			<foreignObject x={bounds.minX} y={bounds.minY} width={width} height={height}>
				<div style={{ width, height, background: 'hsl(180, 70%, 35%)' }} />
			</foreignObject>
		)
	}
}

/*
[1]
The CoralShapeUtil renders a recursively branching reef structure onto a Canvas 2D context.
We use Canvas instead of SVG paths because the recursive algorithm can generate hundreds
of filled polygons, and direct canvas drawing is significantly faster than React DOM diffing.

[2]
The geometry returns a Rectangle2d that encompasses the full rendered area including
the branching spread. This is used for hit testing and selection bounds.

[3]
A single "pull" handle at the tip of the pullVector. Dragging this handle
extends the reef structure in the drag direction.

[4]
On resize, we scale both the base path points and the pull vector proportionally.

[5]
The component renders a <canvas> inside HTMLContainer. We use useLayoutEffect to
draw synchronously before the browser paints, preventing flicker during handle drags.
The canvas handles high-DPI displays via devicePixelRatio scaling.

[6]
The indicator draws a simple rounded rectangle matching the computed bounds.
*/
