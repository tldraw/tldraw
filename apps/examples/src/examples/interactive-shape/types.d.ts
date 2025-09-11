import { IMyInteractiveShape } from './my-interactive-shape-util'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		'my-interactive-shape': IMyInteractiveShape
	}
}
