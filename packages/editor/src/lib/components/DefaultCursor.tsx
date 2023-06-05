import { Vec2dModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { memo, useEffect, useRef } from 'react'
import { useTransform } from '../hooks/useTransform'

/** @public */
export type TLCursorComponent = (props: {
	className?: string
	point: Vec2dModel | null
	zoom: number
	color?: string
	name: string | null
	lastActivityTimestamp: number
}) => any | null

const _Cursor: TLCursorComponent = ({
	className,
	zoom,
	point,
	color,
	name,
	lastActivityTimestamp,
}) => {
	const rDiv = useRef<HTMLDivElement>(null)
	useTransform(rDiv, point?.x, point?.y, 1 / zoom)

	useEffect(() => {
		const div = rDiv.current
		if (!div) return
		const timeout = setTimeout(() => {
			div.style.visibility = 'hidden'
		}, 300)
		div.style.visibility = 'visible'
		return () => clearTimeout(timeout)
	}, [lastActivityTimestamp])

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
