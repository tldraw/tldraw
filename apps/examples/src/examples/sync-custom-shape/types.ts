import { CounterShape } from './CounterShape'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		counter: CounterShape
	}
}
