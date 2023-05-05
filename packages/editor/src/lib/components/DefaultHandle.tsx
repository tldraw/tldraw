import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'

export type TLHandleComponent = (props: { shapeId: TLShapeId; handle: TLHandle }) => any | null

export const DefaultHandle: TLHandleComponent = ({ handle }) => {
	return (
		<g className={classNames('tl-handle', { 'tl-handle__hint': handle.type !== 'vertex' })}>
			<circle className="tl-handle__bg" />
			<circle className="tl-handle__fg" />
		</g>
	)
}
