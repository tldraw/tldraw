import { ICardShape } from './CardShape/card-shape-types'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		card: ICardShape
	}
}
