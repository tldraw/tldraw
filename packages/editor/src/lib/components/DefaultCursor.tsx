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
	chatMessage: string | null
}) => any | null

const _Cursor: TLCursorComponent = ({ className, zoom, point, color, name, chatMessage }) => {
	const rDiv = useRef<HTMLDivElement>(null)
	useTransform(rDiv, point?.x, point?.y, 1 / zoom)

	if (!point) return null

	const tagText = chatMessage || name
	const tagTitle = chatMessage ? name : null

	return (
		<div ref={rDiv} className={classNames('tl-overlays__item', className)}>
			<svg className="tl-cursor">
				<use href="#cursor" color={color} />
			</svg>
			{tagTitle && (
				<div className="tl-nametag-title" style={{ color }}>
					{tagTitle}
				</div>
			)}
			{tagText && (
				<div className="tl-nametag" style={{ backgroundColor: color }}>
					{tagText}
				</div>
			)}
		</div>
	)
}

export const DefaultCursor = memo(_Cursor)
