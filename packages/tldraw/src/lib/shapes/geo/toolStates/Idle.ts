import {
	GeoShapeGeoStyle,
	StateNode,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
} from '@tldraw/editor'
import { startEditingShape } from '../../../tools/SelectTool/selectHelpers'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		const geo = this.editor.getStyleForNextShape(GeoShapeGeoStyle)
		if (
			this.editor.checkCapability('create-shapes', { shapes: [{ type: 'geo', props: { geo } }] })
		) {
			return
		}
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		const { editor } = this
		if (info.key === 'Enter') {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!editor.canEditShape(onlySelectedShape)) return
			startEditingShape(editor, onlySelectedShape, { selectAll: true })
		}
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}
