import { TLStyleType } from '@tldraw/tlschema'
import { StateNode } from '../StateNode'
import { Idle } from './children/Idle'
import { Pointing } from './children/Pointing'

export class TLPeerVideoTool extends StateNode {
	static override id = 'peer-video'
	static initial = 'idle'
	static children = () => [Idle, Pointing]

	styles = ['opacity'] as TLStyleType[]
}
