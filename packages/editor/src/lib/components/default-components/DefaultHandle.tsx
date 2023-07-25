import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { ComponentType } from 'react'

/** @public */
export type TLHandleComponent = ComponentType<{
	shapeId: TLShapeId
	handle: TLHandle
	className?: string
}>

/** @public */
export const DefaultHandle: TLHandleComponent = ({ handle, className }) => {
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
			<circle className="tl-handle__bg" />
			<circle className="tl-handle__fg" />
		</g>
	)
}
