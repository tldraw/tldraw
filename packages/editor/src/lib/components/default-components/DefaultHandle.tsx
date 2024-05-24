import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS, SIDES } from '../../constants'

/** @public */
export interface TLHandleProps {
	shapeId: TLShapeId
	handle: TLHandle
	zoom: number
	isCoarse: boolean
	className?: string
}

/** @public */
export function DefaultHandle({ handle, isCoarse, className, zoom }: TLHandleProps) {
	const br = (isCoarse ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS) / zoom

	if (handle.type === 'clone') {
		// bouba
		const fr = 3 / Math.max(zoom, 0.35)
		const path = `M0,${-fr} A${fr},${fr} 0 0,1 0,${fr}`
		// kiki
		// const fr = 4 / Math.max(zoom, 0.35)
		// const path = `M0,${-fr} L${fr},0 L0,${fr} Z`

		const index = SIDES.indexOf(handle.id as (typeof SIDES)[number])
		return (
			<g className={classNames(`tl-handle tl-handle__${handle.type}`, className)}>
				<circle className="tl-handle__bg" r={br} />
				{/* Half circle */}
				<path className="tl-handle__fg" d={path} transform={`rotate(${-90 + 90 * index})`} />
			</g>
		)
	}

	const fr = (handle.type === 'create' && isCoarse ? 3 : 4) / Math.max(zoom, 0.35)
	return (
		<g className={classNames(`tl-handle tl-handle__${handle.type}`, className)}>
			<circle className="tl-handle__bg" r={br} />
			<circle className="tl-handle__fg" r={fr} />
		</g>
	)
}
