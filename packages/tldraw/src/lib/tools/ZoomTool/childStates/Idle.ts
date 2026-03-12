import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	override onEnter(info: TLPointerEventInfo & { onInteractionEnd: string }) {
		this.info = info
	}

	override onPointerDown() {
		this.parent.transition('pointing', this.info)
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		if (info.key === 'Shift') {
			this.parent.transition('zoom_quick', this.info)
		}
	}
}
