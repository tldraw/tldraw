import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS, SIDES } from '../../constants'

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
	const br = (isCoarse ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS) / zoom
	const fr =
		(handle.type === 'create' && isCoarse ? 3 : handle.type === 'clone' ? 3 : 4) /
		Math.max(zoom, 0.35)

	if (handle.type === 'clone') {
		const path = `M0,${-fr} A${fr},${fr} 0 0,1 0,${fr}`
		const index = SIDES.indexOf(handle.id as (typeof SIDES)[number])
		return (
			<g className={classNames(`tl-handle tl-handle__${handle.type}`, className)}>
				<circle className="tl-handle__bg" r={br} />
				{/* Half circle */}
				<path className="tl-handle__fg" d={path} transform={`rotate(${-90 + 90 * index})`} />
			</g>
		)
	}

	return (
		<g className={classNames(`tl-handle tl-handle__${handle.type}`, className)}>
			<circle className="tl-handle__bg" r={br} />
			<circle className="tl-handle__fg" r={fr} />
		</g>
	)
}
