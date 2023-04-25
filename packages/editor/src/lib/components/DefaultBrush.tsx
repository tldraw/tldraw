import { toDomPrecision } from '@tldraw/primitives'
import { Box2dModel } from '@tldraw/tlschema'

/** @public */
export type TLBrushComponent = (props: { brush: Box2dModel; color?: string }) => any | null

export const DefaultBrush: TLBrushComponent = ({ brush, color }) => {
	return color ? (
		<g className="rs-brush" transform={`translate(${brush.x},${brush.y})`}>
			<rect
				width={toDomPrecision(Math.max(1, brush.w))}
				height={toDomPrecision(Math.max(1, brush.h))}
				fill={color}
				opacity={0.1}
			/>
			<rect
				width={toDomPrecision(Math.max(1, brush.w))}
				height={toDomPrecision(Math.max(1, brush.h))}
				fill="none"
				stroke={color}
				opacity={0.1}
			/>
		</g>
	) : (
		<rect
			className="rs-brush rs-brush__default"
			width={toDomPrecision(Math.max(1, brush.w))}
			height={toDomPrecision(Math.max(1, brush.h))}
			transform={`translate(${brush.x},${brush.y})`}
		/>
	)
}
