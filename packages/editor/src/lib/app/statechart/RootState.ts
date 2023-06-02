import { TLEventHandlers } from '../types/event-types'
import { StateNode } from './StateNode'
import { TLSelectTool } from './TLSelectTool/TLSelectTool'
import { TLZoomTool } from './TLZoomTool/TLZoomTool'

export class RootState extends StateNode {
	static override id = 'root'
	static initial = 'select'
	static children = () => [TLSelectTool, TLZoomTool]

	onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		switch (info.code) {
			case 'KeyZ': {
				if (!(info.shiftKey || info.ctrlKey)) {
					const currentTool = this.current.value
					if (currentTool && currentTool.current.value?.id === 'idle') {
						this.editor.setSelectedTool('zoom', { ...info, onInteractionEnd: currentTool.id })
					}
				}
				break
			}
		}
	}
}
