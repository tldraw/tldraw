import { Vec2dModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { memo, useRef } from 'react'
import { useTransform } from '../hooks/useTransform'

/** @public */
export type TLCursorComponent = (props: {
	className?: string
	point: Vec2dModel | null
	zoom: number
	color?: string
	name: string | null
}) => any | null

const _Cursor: TLCursorComponent = ({ className, zoom, point, color, name }) => {
	const rDiv = useRef<HTMLDivElement>(null)
	useTransform(rDiv, point?.x, point?.y, 1 / zoom)

	if (!point) return null

	return (
		<div ref={rDiv} className={classNames('tl-overlays__item', className)}>
			<svg className="tl-cursor">
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
