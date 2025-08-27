import {
	BaseBoxShapeUtil,
	Circle2d,
	Geometry2d,
	RecordProps,
	SVGContainer,
	T,
	TLBaseShape,
	TLResizeInfo,
	TLShape,
	Vec,
	atom,
	resizeBox,
	toDomPrecision,
} from 'tldraw'

export type CircleClipShape = TLBaseShape<
	'circle-clip',
	{
		w: number
		h: number
	}
>

export const isClippingEnabled$ = atom('isClippingEnabled', true)

export class CircleClipShapeUtil extends BaseBoxShapeUtil<CircleClipShape> {
	static override type = 'circle-clip' as const
	static override props: RecordProps<CircleClipShape> = {
		w: T.number,
		h: T.number,
	}

	override canBind() {
		return false
	}

	override canReceiveNewChildrenOfType(shape: TLShape) {
		return !shape.isLocked
	}

	override providesBackgroundForChildren(): boolean {
		return true
	}

	override getDefaultProps(): CircleClipShape['props'] {
		return {
			w: 200,
			h: 200,
		}
	}

	override getGeometry(shape: CircleClipShape): Geometry2d {
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		return new Circle2d({
			radius,
			x: shape.props.w / 2 - radius,
			y: shape.props.h / 2 - radius,
			isFilled: true,
		})
	}

	override getClipPath(shape: CircleClipShape): Vec[] | undefined {
		// Generate a polygon approximation of the circle
		const centerX = shape.props.w / 2
		const centerY = shape.props.h / 2
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		const segments = 48 // More segments = smoother circle

		const points: Vec[] = []
		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * Math.PI * 2
			const x = centerX + Math.cos(angle) * radius
			const y = centerY + Math.sin(angle) * radius
			points.push(new Vec(x, y))
		}

		return points
	}

	override shouldClipChild(_child: TLShape): boolean {
		// For now, clip all children - we removed the onlyClipText feature for simplicity
		return isClippingEnabled$.get()
	}

	override component(shape: CircleClipShape) {
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		const centerX = shape.props.w / 2
		const centerY = shape.props.h / 2

		const clippingEnabled = isClippingEnabled$.get()

		return (
			<SVGContainer>
				<circle
					cx={toDomPrecision(centerX)}
					cy={toDomPrecision(centerY)}
					r={toDomPrecision(radius)}
					fill={clippingEnabled ? 'rgba(100, 150, 255, 0.1)' : 'rgba(150, 150, 150, 0.1)'}
					stroke={clippingEnabled ? '#4285f4' : '#999'}
					strokeWidth={2}
					strokeDasharray={clippingEnabled ? 'none' : '5,5'}
				/>
				{/* Visual indicator */}
				<text
					x={centerX}
					y={centerY + 4}
					textAnchor="middle"
					fontSize="12"
					fill={clippingEnabled ? '#4285f4' : '#999'}
				>
					{clippingEnabled ? '✂️' : '○'}
				</text>
			</SVGContainer>
		)
	}

	override indicator(shape: CircleClipShape) {
		const radius = Math.min(shape.props.w, shape.props.h) / 2
		const centerX = shape.props.w / 2
		const centerY = shape.props.h / 2

		return (
			<circle
				cx={toDomPrecision(centerX)}
				cy={toDomPrecision(centerY)}
				r={toDomPrecision(radius)}
			/>
		)
	}

	override onResize(shape: CircleClipShape, info: TLResizeInfo<CircleClipShape>) {
		return resizeBox(shape, info)
	}
}
