import { TLEventHandlers } from '../types/event-types'
import { StateNode } from './StateNode'

export class RootState extends StateNode {
	static override id = 'root'
	static override initial = ''
	static override children = () => []

	override onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		switch (info.code) {
			case 'KeyZ': {
				if (!(info.shiftKey || info.ctrlKey)) {
					const currentTool = this.current.value
					if (currentTool && currentTool.current.value?.id === 'idle') {
						if (this.children!['zoom']) {
							this.editor.setCurrentTool('zoom', { ...info, onInteractionEnd: currentTool.id })
						}
					}
				}
				break
			}
		}
	}
}
