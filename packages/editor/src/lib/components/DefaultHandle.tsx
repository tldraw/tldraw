import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'

export type TLHandleComponent = (props: { shapeId: TLShapeId; handle: TLHandle }) => any | null

export const DefaultHandle: TLHandleComponent = ({ handle }) => {
	return (
		<g className={classNames('rs-handle', { 'rs-handle__hint': handle.type !== 'vertex' })}>
			<circle className="rs-handle__bg" />
			<circle className="rs-handle__fg" />
		</g>
	)
}
