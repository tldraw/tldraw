import { Vec2dModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { memo, useLayoutEffect, useRef } from 'react'
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
	const rCursor = useRef<HTMLDivElement>(null)
	const rChat = useRef<HTMLDivElement>(null)
	useTransform(rCursor, point?.x, point?.y, 1 / zoom)

	useLayoutEffect(() => {
		const chatBubble = rChat.current
		if (!chatBubble) return
		chatBubble.classList.remove('tl-cursor-chat-fade')
		requestAnimationFrame(() => {
			chatBubble.classList.add('tl-cursor-chat-fade')
		})

		return () => {
			chatBubble.classList.remove('tl-cursor-chat-fade')
		}
	}, [chatMessage, rChat])

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
					<div className="tl-nametag-chat" ref={rChat} style={{ backgroundColor: color }}>
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

export const DefaultCursor = memo(_Cursor)
