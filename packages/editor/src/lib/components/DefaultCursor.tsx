import { Vec2dModel } from '@tldraw/tlschema'
import { memo } from 'react'
import { truncateStringWithEllipsis } from '../utils/dom'

/** @public */
export type TLCursorComponent = (props: {
	point: Vec2dModel | null
	zoom: number
	color?: string
	nameTag: string | null
}) => any | null

const _Cursor: TLCursorComponent = ({ zoom, point, color, nameTag }) => {
	if (!point) return null

	return (
		<g transform={`translate(${point.x}, ${point.y}) scale(${1 / zoom})`}>
			<use href="#cursor" color={color} />
			{nameTag !== null && nameTag !== '' && (
				<foreignObject
					x="13"
					y="16"
					width="1"
					height="1"
					style={{
						overflow: 'visible',
					}}
				>
					<div
						className="rs-nametag"
						style={{
							backgroundColor: color,
						}}
					>
						{truncateStringWithEllipsis(nameTag, 40)}
					</div>
				</foreignObject>
			)}
		</g>
	)
}

export const DefaultCursor = memo(_Cursor)
