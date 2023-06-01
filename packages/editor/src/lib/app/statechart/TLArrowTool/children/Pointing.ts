import { createShapeId, TLArrowShape } from '@tldraw/tlschema'
import { TLArrowUtil } from '../../../shapeutils/TLArrowUtil/TLArrowUtil'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { TLArrowTool } from '../TLArrowTool'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLArrowShape

	preciseTimeout = -1
	didTimeout = false

	private startPreciseTimeout() {
		this.preciseTimeout = window.setTimeout(() => {
			if (!this.isActive) return
			if (!this.shape) return
			this.didTimeout = true
		}, 300)
	}

	private clearPreciseTimeout() {
		clearTimeout(this.preciseTimeout)
	}

	onEnter = () => {
		const {
			inputs: { currentPagePoint },
		} = this.app

		this.didTimeout = false

		const shapeType = (this.parent as TLArrowTool).shapeType

		this.app.mark('creating')

		const id = createShapeId()

		this.app.createShapes([
			{
				id,
				type: shapeType,
				x: currentPagePoint.x,
				y: currentPagePoint.y,
			},
		])

		const util = this.app.getShapeUtil(TLArrowUtil)
		const shape = this.app.getShapeById<TLArrowShape>(id)
		if (!shape) return

		const handles = util.handles?.(shape)

		if (handles) {
			// start precise
			const point = this.app.getPointInShapeSpace(shape, currentPagePoint)

			const change = util.onHandleChange?.(shape, {
				handle: { ...handles[0], x: point.x, y: point.y },
				isPrecise: true,
			})

			if (change) {
				const startTerminal = change.props?.start
				if (startTerminal?.type === 'binding') {
					this.app.setHintingIds([startTerminal.boundShapeId])
				}
				this.app.updateShapes([change], true)
			}
		}

		this.app.select(id)

		this.shape = this.app.getShapeById(id)

		this.startPreciseTimeout()
	}

	onExit = () => {
		this.clearPreciseTimeout()
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (!this.shape) return

		if (this.app.inputs.isDragging) {
			const util = this.app.getShapeUtil(this.shape)
			const handles = util.handles?.(this.shape)

			if (!handles) {
				this.app.bailToMark('creating')
				throw Error('No handles found')
			}

			if (!this.didTimeout) {
				const util = this.app.getShapeUtil(TLArrowUtil)
				const shape = this.app.getShapeById<TLArrowShape>(this.shape.id)

				if (!shape) return

				const handles = util.handles(shape)

				if (handles) {
					const { x, y } = this.app.getPointInShapeSpace(shape, this.app.inputs.originPagePoint)
					const change = util.onHandleChange?.(shape, {
						handle: {
							...handles[0],
							x,
							y,
						},
						isPrecise: false,
					})

					if (change) {
						this.app.updateShapes([change], true)
					}
				}
			}

			this.app.setSelectedTool('select.dragging_handle', {
				shape: this.shape,
				handle: handles.find((h) => h.id === 'end')! /* end */,
				isCreating: true,
				onInteractionEnd: 'arrow',
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.cancel()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.cancel()
	}

	cancel() {
		this.app.bailToMark('creating')
		this.app.setHintingIds([])
		this.parent.transition('idle', {})
	}
}
