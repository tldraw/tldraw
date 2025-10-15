import { FairyEntity } from '@tldraw/dotcom-shared'
import { Atom, StateNode, TLKeyboardEventInfo } from 'tldraw'

export class FairyThrowTool extends StateNode {
	static override id = 'fairy-throw'
	static override children() {
		return [PointingState, ThrowingState]
	}
	static override initial = 'pointing'

	fairy: Atom<FairyEntity> | null = null

	clickOffset = { x: 0, y: 0 }

	override onEnter() {
		if (!this.fairy) return
		this.fairy.update((f) => ({ ...f, isSelected: true }))
		this.editor.setCursor({ type: 'grabbing', rotation: 0 })
	}

	setFairy(fairy: Atom<FairyEntity>) {
		this.fairy = fairy
	}
}

class PointingState extends StateNode {
	static override id = 'pointing'

	override onEnter() {
		const tool = this.parent as FairyThrowTool
		const { editor } = this

		if (!tool.fairy) return

		// Calculate offset between click position and fairy position
		const originPagePoint = editor.inputs.currentPagePoint
		const fairyPosition = tool.fairy.get().position

		tool.clickOffset = {
			x: fairyPosition.x - originPagePoint.x,
			y: fairyPosition.y - originPagePoint.y,
		}
	}

	override onPointerUp() {
		// User released without moving - cancel the tool
		this.editor.setCurrentTool('select')
	}

	override onPointerMove() {
		// User started moving - transition to throwing
		this.parent.transition('throwing')
	}

	override onKeyDown(info: TLKeyboardEventInfo): void {
		if (info.key === 'Escape') {
			this.editor.setCurrentTool('select')
		}
	}
}

class ThrowingState extends StateNode {
	static override id = 'throwing'

	override onPointerMove() {
		const tool = this.parent as FairyThrowTool
		const { editor } = this

		if (!tool.fairy) return
		// Get current pointer position and convert to page space
		const screenPoint = editor.inputs.currentScreenPoint
		const { screenBounds } = editor.getInstanceState()
		const pagePoint = editor.screenToPage({
			x: screenPoint.x + screenBounds.x,
			y: screenPoint.y + screenBounds.y,
		})

		const newPosition = {
			x: pagePoint.x + tool.clickOffset.x,
			y: pagePoint.y + tool.clickOffset.y,
		}

		// Update fairy position
		tool.fairy.update((f) => ({
			...f,
			position: newPosition,
		}))
	}

	override onPointerUp() {
		this.cancel()
	}

	cancel() {
		this.editor.setCurrentTool('select')
		this.editor.setCursor({ type: 'grab', rotation: 0 })
	}
}
