import { StateNode, TLStateNodeConstructor } from 'tldraw'

export class DraggingItemTool_Idle extends StateNode {
	static override id = 'idle'
}

export class DraggingItemTool extends StateNode {
	static override id = 'dragging-item'
	static override initial = 'idle'
	static override isLockable = false
	static override children(): TLStateNodeConstructor[] {
		return [DraggingItemTool_Idle]
	}
}
