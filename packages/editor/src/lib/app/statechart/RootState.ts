import { TLEventHandlers } from '../types/event-types'
import { StateNode } from './StateNode'
import { TLArrowTool } from './TLArrowTool/TLArrowTool'
import { TLDrawTool } from './TLDrawTool/TLDrawTool'
import { TLEraserTool } from './TLEraserTool/TLEraserTool'
import { TLFrameTool } from './TLFrameTool/TLFrameTool'
import { TLGeoTool } from './TLGeoTool/TLGeoTool'
import { TLHandTool } from './TLHandTool/TLHandTool'
import { TLLineTool } from './TLLineTool/TLLineTool'
import { TLNoteTool } from './TLNoteTool/TLNoteTool'
import { TLSelectTool } from './TLSelectTool/TLSelectTool'
import { TLTextTool } from './TLTextTool/TLTextTool'
import { TLZoomTool } from './TLZoomTool/TLZoomTool'

export class RootState extends StateNode {
	static override id = 'root'
	static initial = 'select'
	static children = () => [
		TLSelectTool,
		TLHandTool,
		TLEraserTool,
		TLDrawTool,
		TLTextTool,
		TLLineTool,
		TLArrowTool,
		TLGeoTool,
		TLNoteTool,
		TLFrameTool,
		TLZoomTool,
	]

	onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		switch (info.code) {
			case 'KeyZ': {
				if (!(info.shiftKey || info.ctrlKey)) {
					const currentTool = this.current.value
					if (currentTool && currentTool.current.value?.id === 'idle') {
						this.app.setSelectedTool('zoom', { ...info, onInteractionEnd: currentTool.id })
					}
				}
				break
			}
		}
	}
}
