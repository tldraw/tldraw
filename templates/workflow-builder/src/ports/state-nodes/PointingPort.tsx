import { StateNode, TLPointerEventInfo } from 'tldraw'

export class PointingPort extends StateNode {
	static override id = 'pointing_port'

	override onEnter(info: TLPointerEventInfo) {
		console.log('enter pointing port', info)
	}
}
