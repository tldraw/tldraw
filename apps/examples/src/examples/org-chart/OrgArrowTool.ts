import { StateNode, TLEventHandlers, TLShapeId, createShapeId } from 'tldraw'
import { OrgArrowShape } from './OrgChartArrowShape'

export class OrgArrowtool extends StateNode {
	static override id = 'org-arrow'
	fromId: TLShapeId | undefined = undefined

	override onEnter = () => {
		this.fromId = undefined
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (_info) => {
		const { currentPagePoint } = this.editor.inputs
		this.fromId = this.editor.getShapeAtPoint(currentPagePoint)?.id
	}

	override onPointerUp: TLEventHandlers['onPointerDown'] = (_info) => {
		if (!this.fromId) return
		const { currentPagePoint } = this.editor.inputs
		const shapeUnderPoint = this.editor.getShapeAtPoint(currentPagePoint)

		if (!shapeUnderPoint || shapeUnderPoint.id === this.fromId) return

		const boundsFrom = this.editor.getShapePageBounds(this.fromId)
		const boundsTo = this.editor.getShapePageBounds(shapeUnderPoint.id)
		if (!boundsFrom || !boundsTo) return

		const arrowId = createShapeId()
		this.editor.batch(() => {
			this.editor.createShape<OrgArrowShape>({
				id: arrowId,
				type: 'org-arrow',
				isLocked: true,
			})
			this.editor.sendToBack([arrowId])
			this.editor.createBinding({
				type: 'org-arrow',
				fromId: arrowId,
				toId: this.fromId,
			})
			this.editor.createBinding({
				type: 'org-arrow',
				fromId: arrowId,
				toId: shapeUnderPoint.id,
			})
		})
	}
}
