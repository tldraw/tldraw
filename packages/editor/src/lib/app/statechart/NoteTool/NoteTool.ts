import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class NoteTool extends StateNode {
	static override id = 'note'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	styles = ['color', 'opacity', 'size', 'align', 'font'] as TLStyleType[]
}
