import { Vec2dModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { memo, useEffect, useRef, useState } from 'react'
import { track } from 'signia-react'
import { useEditor } from '../hooks/useEditor'
import { useTransform } from '../hooks/useTransform'
import { DEFAULT_COLLABORATOR_TIMEOUT } from './LiveCollaborators'

/** @public */
export type TLCursorComponent = (props: {
	className?: string
	point: Vec2dModel | null
	zoom: number
	color?: string
	name: string | null
	lastActivityTimestamp: number
	userId: string
}) => any | null

const _Cursor: TLCursorComponent = track(
	({ className, zoom, point, color, name, lastActivityTimestamp, userId }) => {
		const editor = useEditor()
		const rDiv = useRef<HTMLDivElement>(null)
		useTransform(rDiv, point?.x, point?.y, 1 / zoom)

		const [isTimedOut, setIsTimedOut] = useState(false)

		useEffect(() => {
			// By default, show the cursor
			setIsTimedOut(false)

			// After a few seconds of inactivity, hide the cursor
			const timeout = setTimeout(() => {
				setIsTimedOut(true)
			}, DEFAULT_COLLABORATOR_TIMEOUT)

			return () => clearTimeout(timeout)
		}, [lastActivityTimestamp])

		if (!point) return null
		if (isTimedOut && editor.instanceState.followingUserId !== userId) return null

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
)

export const DefaultCursor = memo(_Cursor)
