import { StateNode, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	override onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
	}

	override onPointerDown: TLEventHandlers['onPointerUp'] = () => {
		this.parent.transition('pointing', this.info)
	}
}
