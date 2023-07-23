import { Vec2dModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { ComponentType, memo, useRef } from 'react'
import { useTransform } from '../../hooks/useTransform'

/** @public */
export type TLCursorComponent = ComponentType<{
	className?: string
	point: Vec2dModel | null
	zoom: number
	color?: string
	name: string | null
	chatMessage: string
}>

const _Cursor: TLCursorComponent = ({ className, zoom, point, color, name, chatMessage }) => {
	const rCursor = useRef<HTMLDivElement>(null)
	useTransform(rCursor, point?.x, point?.y, 1 / zoom)

	if (!point) return null

	return (
		<div ref={rCursor} className={classNames('tl-overlays__item', className)}>
			<svg className="tl-cursor">
				<use href="#cursor" color={color} />
			</svg>
			{chatMessage ? (
				<>
					{name && (
						<div className="tl-nametag-title" style={{ color }}>
							{name}
						</div>
					)}
					<div className="tl-nametag-chat" style={{ backgroundColor: color }}>
						{chatMessage}
					</div>
				</>
			) : (
				name && (
					<div className="tl-nametag" style={{ backgroundColor: color }}>
						{name}
					</div>
				)
			)}
		</div>
	)
}

/** @public */
export const DefaultCursor = memo(_Cursor)
