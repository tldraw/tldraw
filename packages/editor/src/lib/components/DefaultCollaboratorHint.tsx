import { Box2d, clamp, radiansToDegrees, Vec2d } from '@tldraw/primitives'
import { Vec2dModel } from '@tldraw/tlschema'

export type TLCollaboratorHintComponent = (props: {
	point: Vec2dModel
	viewport: Box2d
	zoom: number
	color: string
}) => JSX.Element | null

export const DefaultCollaboratorHint: TLCollaboratorHintComponent = ({
	zoom,
	point,
	color,
	viewport,
}) => {
	const x = clamp(point.x, viewport.minX + 5 / zoom, viewport.maxX - 5 / zoom)
	const y = clamp(point.y, viewport.minY + 5 / zoom, viewport.maxY - 5 / zoom)

	const direction = radiansToDegrees(Vec2d.Angle(viewport.center, point))

	return (
		<>
			<use
				href="#cursor_hint"
				transform={`translate(${x}, ${y}) scale(${1 / zoom}) rotate(${direction})`}
				color={color}
			/>
		</>
	)
}
