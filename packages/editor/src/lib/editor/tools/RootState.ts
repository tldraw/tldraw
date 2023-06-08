import { TLEventHandlers } from '../types/event-types'
import { SelectTool } from './SelectTool/SelectTool'
import { StateNode } from './StateNode'
import { ZoomTool } from './ZoomTool/ZoomTool'

export class RootState extends StateNode {
	static override id = 'root'
	static initial = 'select'
	static children = () => [SelectTool, ZoomTool]

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
