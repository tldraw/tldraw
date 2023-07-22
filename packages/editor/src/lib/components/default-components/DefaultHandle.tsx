import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { ComponentType } from 'react'

/** @public */
export type TLHandleComponent = ComponentType<{
	shapeId: TLShapeId
	handle: TLHandle
	className?: string
}>

export const DefaultHandle: TLHandleComponent = ({ handle, className }) => {
	return (
		<g
			className={classNames(
				'tl-handle',
				{ 'tl-handle__hint': handle.type !== 'vertex' },
				className
			)}
		>
			<circle className="tl-handle__bg" />
			<circle className="tl-handle__fg" />
		</g>
	)
}
