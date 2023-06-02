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
	chatMessage: string
	chatMessageTimestamp: number | null
}) => any | null

const DEFAULT_CHAT_MESSAGE_TIMEOUT = 4500

const _Cursor: TLCursorComponent = ({
	className,
	zoom,
	point,
	color,
	name,
	chatMessage,
	chatMessageTimestamp,
}) => {
	const rCursor = useRef<HTMLDivElement>(null)
	const rChat = useRef<HTMLDivElement>(null)
	useTransform(rCursor, point?.x, point?.y, 1 / zoom)

	useLayoutEffect(() => {
		const chatBubble = rChat.current
		if (!chatBubble) return
		if (chatMessageTimestamp === null) return

		chatBubble.classList.remove('tl-cursor-chat-fade')
		requestAnimationFrame(() => {
			chatBubble.classList.add('tl-cursor-chat-fade')
		})

		return () => {
			chatBubble.classList.remove('tl-cursor-chat-fade')
		}
	}, [chatMessageTimestamp, rChat])

	const isChatMessageVisible =
		chatMessage &&
		(!chatMessageTimestamp || Date.now() - chatMessageTimestamp < DEFAULT_CHAT_MESSAGE_TIMEOUT)

	if (!point) return null

	return (
		<div ref={rCursor} className={classNames('tl-overlays__item', className)}>
			<svg className="tl-cursor">
				<use href="#cursor" color={color} />
			</svg>
			{isChatMessageVisible ? (
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
