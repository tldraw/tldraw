import { TLEventHandlers, TLPointerEventInfo } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Idle extends StateNode {
	static override id = 'idle'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
	}

	onPointerDown: TLEventHandlers['onPointerUp'] = () => {
		this.parent.transition('pointing', this.info)
	}
}
