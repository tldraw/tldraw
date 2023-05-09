import { Vec2dModel } from '@tldraw/tlschema'
import { memo } from 'react'

/** @public */
export type TLCursorComponent = (props: {
	point: Vec2dModel | null
	zoom: number
	color?: string
	name: string | null
}) => any | null

const _Cursor: TLCursorComponent = ({ zoom, point, color, name }) => {
	if (!point) return null

	return (
		<div
			className="tl-cursor"
			style={{ transform: `translate(${point.x}px, ${point.y}px) scale(${1 / zoom})` }}
		>
			<svg>
				<use href="#cursor" color={color} />
			</svg>
			{name !== null && name !== '' && (
				<div className="tl-nametag" style={{ backgroundColor: color }}>
					{name}
				</div>
			)}
		</div>
	)
}

export const DefaultCursor = memo(_Cursor)
