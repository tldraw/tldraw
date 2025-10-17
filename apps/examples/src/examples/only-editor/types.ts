import { MiniBoxShape } from './MiniBoxShape'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		box: MiniBoxShape
	}
}
