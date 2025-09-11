import { ConnectionShape } from './connection/ConnectionShapeUtil'
import { NodeShape } from './nodes/NodeShapeUtil'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		connection: ConnectionShape
		node: NodeShape
	}
}
