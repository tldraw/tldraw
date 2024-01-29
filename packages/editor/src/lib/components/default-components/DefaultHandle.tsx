import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { ComponentType } from 'react'
import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS } from '../../constants'

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
	if (handle.type === 'text-adjust') {
		return (
			<g className={classNames('tl-handle', 'tl-handle__text-adjust', className)}>
				<rect rx={4} ry={4} width={handle.w} height={handle.h} />
			</g>
		)
	}

	const bgRadius = (isCoarse ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS) / zoom
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
