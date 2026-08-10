import { VecModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { memo, useRef } from 'react'
import { useSharedSafeId } from '../../hooks/useSafeId'
import { useTransform } from '../../hooks/useTransform'

/** @public */
export interface TLCursorProps {
	userId: string
	className?: string
	point: VecModel | null
	zoom: number
	color?: string
	name: string | null
	chatMessage: string
}

/**
 * The default collaborator cursor: the arrow glyph plus a name tag or chat bubble. The arrow is a
 * `<use>` of a shared `<defs>` symbol that `LiveCollaborators` renders, so a `DefaultCursor`
 * used outside that layer draws no arrow.
 *
 * @public @react
 */
export const DefaultCursor = memo(function DefaultCursor({
	className,
	zoom,
	point,
	color,
	name,
	chatMessage,
}: TLCursorProps) {
	const rCursor = useRef<HTMLDivElement>(null)
	useTransform(rCursor, point?.x, point?.y, 1 / zoom)

	const cursorId = useSharedSafeId('cursor')

	if (!point) return null

	return (
		<div ref={rCursor} className={classNames('tl-collaborators__item', className)}>
			<svg className="tl-cursor" aria-hidden="true">
				<use href={`#${cursorId}`} color={color} />
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
})
