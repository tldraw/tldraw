import { StateNode } from '../StateNode'

import { TLBaseShape, TLStyleType } from '@tldraw/tlschema'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

/** @public */
export type TLBoxLike = TLBaseShape<string, { w: number; h: number }>

/** @public */
export abstract class BaseBoxTool extends StateNode {
	static override id = 'box'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	abstract shapeType: string

	styles = ['opacity'] as TLStyleType[]
}
