import classNames from 'classnames'
import { TLHandle } from '../schema/misc/TLHandle'
import { TLShapeId } from '../schema/records/TLShape'

export type TLHandleComponent = (props: {
	shapeId: TLShapeId
	handle: TLHandle
	className?: string
}) => any | null

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
