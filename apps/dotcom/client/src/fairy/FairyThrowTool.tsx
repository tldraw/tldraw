import { StateNode, TLKeyboardEventInfo, Vec, VecModel } from 'tldraw'
import { FairyAgent } from './fairy-agent/FairyAgent'

export class FairyThrowTool extends StateNode {
	static override id = 'fairy-throw'
	static override children() {
		return [PointingState, ThrowingState]
	}
	static override initial = 'pointing'

	static override isLockable = false

	fairies: FairyAgent[] = []

	initialFairyPositions = new Map<FairyAgent, VecModel>()

	clickOffsets = new Map<FairyAgent, { x: number; y: number }>()

	override onEnter() {
		if (this.fairies.length === 0) return
		for (const fairy of this.fairies) {
			fairy.updateEntity((f) => ({ ...f, isSelected: true }))
		}
		for (const fairy of this.fairies) {
			const initialPosition = fairy.getEntity()?.position
			if (!initialPosition) {
				throw Error('Initial fairy position not found')
			}
			this.initialFairyPositions.set(fairy, initialPosition)
		}
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	setFairies(fairies: FairyAgent[]) {
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
		// Use originPagePoint instead of currentPagePoint to ensure correct positioning on mobile
		const originPagePoint = editor.inputs.originPagePoint
		tool.clickOffsets.clear()

		for (const fairy of tool.fairies) {
			const fairyPosition = fairy.getEntity()?.position
			if (!fairyPosition) continue
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
		if (this.editor.inputs.isDragging) {
			// User started moving - transition to throwing
			this.parent.transition('throwing')
		}
	}

	override onKeyDown(info: TLKeyboardEventInfo): void {
		if (info.key === 'Escape') {
			this.editor.setCurrentTool('select.idle')
		}
	}
}

class ThrowingState extends StateNode {
	static override id = 'throwing'

	flipX = false
	lastDirectionChangePosition = new Vec()

	override onEnter() {
		this.flipX = this.editor.inputs.currentPagePoint.x < this.editor.inputs.originPagePoint.x
		this.lastDirectionChangePosition.setTo(this.editor.inputs.currentPagePoint)
	}

	override onPointerMove() {
		const tool = this.parent as FairyThrowTool
		const { editor } = this

		if (Math.abs(this.lastDirectionChangePosition.x - this.editor.inputs.currentPagePoint.x) > 32) {
			this.flipX = this.editor.inputs.currentPagePoint.x < this.lastDirectionChangePosition.x
			this.lastDirectionChangePosition.setTo(this.editor.inputs.currentPagePoint)
		}

		if (tool.fairies.length === 0) return

		for (const fairy of tool.fairies) {
			const initialPosition = tool.initialFairyPositions.get(fairy)
			if (!initialPosition) continue
			const offset = Vec.Sub(editor.inputs.currentPagePoint, editor.inputs.originPagePoint)

			const newPosition = {
				x: initialPosition.x + offset.x,
				y: initialPosition.y + offset.y,
			}

			fairy.updateEntity((f) => ({
				...f,
				flipX: this.flipX,
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
