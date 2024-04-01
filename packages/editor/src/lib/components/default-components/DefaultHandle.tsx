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
	const fgRadius =
		(handle.type === 'create' && isCoarse ? 3 : handle.type === 'clone' ? 2.5 : 4) /
		Math.max(zoom, 0.35)

	return (
		<g className={classNames(`tl-handle tl-handle__${handle.type}`, className)}>
			<circle className="tl-handle__bg" r={bgRadius} />
			<circle className="tl-handle__fg" r={fgRadius} />
		</g>
	)
}
