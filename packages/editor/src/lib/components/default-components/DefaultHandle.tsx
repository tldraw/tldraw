import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'
import { SIDES } from '../../constants'
import { useEditor } from '../../hooks/useEditor'

/** @public */
export interface TLHandleProps {
	shapeId: TLShapeId
	handle: TLHandle
	zoom: number
	isCoarse: boolean
	className?: string
}

/** @public @react */
export function DefaultHandle({ handle, isCoarse, className, zoom }: TLHandleProps) {
	const editor = useEditor()
	const br = (isCoarse ? editor.options.coarseHandleRadius : editor.options.handleRadius) / zoom

	if (handle.type === 'clone') {
		// bouba
		const fr = 3 / zoom
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

	const fr = (handle.type === 'create' && isCoarse ? 3 : 4) / Math.max(zoom, 0.25)
	return (
		<g className={classNames(`tl-handle tl-handle__${handle.type}`, className)}>
			<circle className="tl-handle__bg" r={br} />
			<circle className="tl-handle__fg" r={fr} />
		</g>
	)
}
