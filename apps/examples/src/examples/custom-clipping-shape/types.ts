import { CircleClipShape } from './CircleClipShapeUtil'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		'circle-clip': CircleClipShape
	}
}
