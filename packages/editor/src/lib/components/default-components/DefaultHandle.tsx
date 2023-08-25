import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { ComponentType } from 'react'

/** @public */
export type TLHandleComponent = ComponentType<{
	shapeId: TLShapeId
	handle: TLHandle
	zoom: number
	isCoarse: boolean
	className?: string
}>

/** @public */
export const DefaultHandle: TLHandleComponent = ({ handle, isCoarse, className, zoom }) => {
	const bgRadius = (isCoarse ? 20 : 12) / zoom
	const fgRadius = (handle.type === 'create' && isCoarse ? 3 : 4) / zoom

	return (
		<g
			className={classNames(
				'tl-handle',
				{
					'tl-handle__virtual': handle.type === 'virtual',
					'tl-handle__create': handle.type === 'create',
				},
				className
			)}
		>
			<circle className="tl-handle__bg" r={bgRadius} />
			<circle className="tl-handle__fg" r={fgRadius} />
		</g>
	)
}
