import { TLEventHandlers } from '../types/event-types'
import { StateNode } from './StateNode'
import { TLArrowTool } from './TLArrowTool/TLArrowTool'
import { TLDrawTool } from './TLDrawTool/TLDrawTool'
import { TLHighlightTool } from './TLDrawTool/TLHighlightTool'
import { TLEraserTool } from './TLEraserTool/TLEraserTool'
import { TLFrameTool } from './TLFrameTool/TLFrameTool'
import { TLGeoTool } from './TLGeoTool/TLGeoTool'
import { TLHandTool } from './TLHandTool/TLHandTool'
import { TLLaserTool } from './TLLaserTool/TLLaserTool'
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
		TLHighlightTool,
		TLTextTool,
		TLLineTool,
		TLArrowTool,
		TLGeoTool,
		TLNoteTool,
		TLFrameTool,
		TLZoomTool,
		TLLaserTool,
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
