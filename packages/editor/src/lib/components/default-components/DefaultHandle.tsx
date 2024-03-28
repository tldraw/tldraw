import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS } from '../../constants'

/** @public */
export type TLHandleProps = {
	shapeId: TLShapeId
	handle: TLHandle
	zoom: number
	isCoarse: boolean
	className?: string
}

/** @public */
export function DefaultHandle({ handle, isCoarse, className, zoom }: TLHandleProps) {
	const bgRadius = (isCoarse ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS) / zoom
	const fgRadius = (handle.type === 'create' && isCoarse ? 3 : 4) / zoom

	// todo: this is bad
	// @ts-expect-error
	if (handle.type === 'note-create') {
		return (
			<rect
				className="tl-handle tl-handle__create"
				width={200}
				height={200}
				fill="rgba(255,192,120,0.2)"
			/>
		)
	}

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
