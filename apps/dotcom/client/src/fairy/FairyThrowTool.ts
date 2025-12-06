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
			fairy.updateEntity((f) => ({ ...f, isSelected: true, velocity: { x: 0, y: 0 } }))
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
		// Use getOriginPagePoint() instead of getCurrentPagePoint() to ensure correct positioning on mobile
		const originPagePoint = editor.inputs.getOriginPagePoint()
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
		if (this.editor.inputs.getIsDragging()) {
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
		this.flipX =
			this.editor.inputs.getCurrentPagePoint().x < this.editor.inputs.getOriginPagePoint().x
		this.lastDirectionChangePosition.setTo(this.editor.inputs.getCurrentPagePoint())
	}

	override onPointerMove() {
		const tool = this.parent as FairyThrowTool
		const { editor } = this

		if (
			Math.abs(this.lastDirectionChangePosition.x - this.editor.inputs.getCurrentPagePoint().x) > 32
		) {
			this.flipX = this.editor.inputs.getCurrentPagePoint().x < this.lastDirectionChangePosition.x
			this.lastDirectionChangePosition.setTo(this.editor.inputs.getCurrentPagePoint())
		}

		if (tool.fairies.length === 0) return

		for (const fairy of tool.fairies) {
			const initialPosition = tool.initialFairyPositions.get(fairy)
			if (!initialPosition) continue
			const offset = Vec.Sub(
				editor.inputs.getCurrentPagePoint(),
				editor.inputs.getOriginPagePoint()
			)

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
		// Set the selected fairy's velocity to the pointer movement
		const tool = this.parent as FairyThrowTool
		const fairies = tool.fairies.filter((f) => f.getEntity()?.isSelected)
		if (fairies.length === 0) {
			this.cancel()
			return
		}

		const pointerVelocity = this.editor.inputs.getPointerVelocity()
		const inverseZoomLevel = 1 / this.editor.getZoomLevel()
		const scaledPointerVelocity = Vec.Mul(pointerVelocity, inverseZoomLevel)
		for (const fairy of fairies) {
			fairy.updateEntity((f) => ({ ...f, velocity: scaledPointerVelocity }))
		}

		this.cancel()
	}

	cancel() {
		this.editor.setCurrentTool('select.idle')
	}
}
