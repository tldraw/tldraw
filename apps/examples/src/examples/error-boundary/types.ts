import { ErrorShape } from './ErrorShape'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		error: ErrorShape
	}
}
