import { TLHandle, TLShapeId } from '@tldraw/tlschema'
import classNames from 'classnames'

export type TLHandleComponent = (props: { shapeId: TLShapeId; handle: TLHandle }) => any | null

export const DefaultHandle: TLHandleComponent = ({ handle }) => {
	return (
		<g className={classNames('rs-handle', { 'rs-handle-hint': handle.type !== 'vertex' })}>
			<circle className="rs-handle-bg" />
			<circle className="rs-handle-fg" />
		</g>
	)
}
