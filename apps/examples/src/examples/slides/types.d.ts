import { SlideShape } from './SlideShapeUtil'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		slide: SlideShape
	}
}
