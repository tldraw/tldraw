import { FairyEntity } from '@tldraw/fairy-shared'
import { Atom, StateNode, TLKeyboardEventInfo } from 'tldraw'

export class FairyThrowTool extends StateNode {
	static override id = 'fairy-throw'
	static override children() {
		return [PointingState, ThrowingState]
	}
	static override initial = 'pointing'

	static override isLockable = false

	fairies: Atom<FairyEntity>[] = []

	clickOffsets = new Map<Atom<FairyEntity>, { x: number; y: number }>()

	override onEnter() {
		if (this.fairies.length === 0) return
		for (const fairy of this.fairies) {
			fairy.update((f) => ({ ...f, isSelected: true }))
		}
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	setFairies(fairies: Atom<FairyEntity>[]) {
		this.fairies = fairies
	}
}

class PointingState extends StateNode {
	static override id = 'pointing'

	override onEnter() {
		const tool = this.parent as FairyThrowTool
		const { editor } = this

		if (tool.fairies.length === 0) return

		// Calculate offset between click position and each fairy position
		const originPagePoint = editor.inputs.currentPagePoint
		tool.clickOffsets.clear()

		for (const fairy of tool.fairies) {
			const fairyEntity = fairy.get()
			if (!fairyEntity) continue

			const fairyPosition = fairyEntity.position
			tool.clickOffsets.set(fairy, {
				x: fairyPosition.x - originPagePoint.x,
				y: fairyPosition.y - originPagePoint.y,
			})
		}
	}

	override onPointerUp() {
		// User released without moving - cancel the tool
		this.editor.setCurrentTool('select.idle')
	}

	override onPointerMove() {
		// User started moving - transition to throwing
		this.parent.transition('throwing')
	}

	override onKeyDown(info: TLKeyboardEventInfo): void {
		if (info.key === 'Escape') {
			this.editor.setCurrentTool('select.idle')
		}
	}
}

class ThrowingState extends StateNode {
	static override id = 'throwing'

	override onPointerMove() {
		const tool = this.parent as FairyThrowTool
		const { editor } = this

		if (tool.fairies.length === 0) return
		// Get current pointer position and convert to page space
		const screenPoint = editor.inputs.currentScreenPoint
		const { screenBounds } = editor.getInstanceState()
		const pagePoint = editor.screenToPage({
			x: screenPoint.x + screenBounds.x,
			y: screenPoint.y + screenBounds.y,
		})

		// Update positions for all fairies
		for (const fairy of tool.fairies) {
			const offset = tool.clickOffsets.get(fairy)
			if (!offset) continue

			const newPosition = {
				x: pagePoint.x + offset.x,
				y: pagePoint.y + offset.y,
			}

			fairy.update((f) => ({
				...f,
				position: newPosition,
			}))
		}
	}

	override onPointerUp() {
		this.cancel()
	}

	cancel() {
		this.editor.setCurrentTool('select.idle')
	}
}
