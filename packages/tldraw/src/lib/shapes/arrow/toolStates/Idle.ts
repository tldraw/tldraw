import {
	Edge2d,
	StateNode,
	TLArrowShapeProps,
	TLKeyboardEventInfo,
	TLPointerEventInfo,
	TLShapeId,
	createShapeId,
	shortAngleDist,
} from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	tempShapeId = null as TLShapeId | null
	existingPair = null as [TLShapeId, TLShapeId] | null

	cleanup(s: string) {
		this.editor.setHintingShapes([])
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		if (this.tempShapeId) {
			this.editor.deleteShape(this.tempShapeId!)
		}
		this.existingPair = null
		this.tempShapeId = null
	}

	override onPointerMove() {
		this.editor.run(
			() => {
				const target = this.editor
					.getShapesAtPoint(this.editor.inputs.currentPagePoint, {
						margin: 40,
						hitInside: true,
					})
					.filter((s) => s.type !== 'arrow')
					.filter(
						(s) =>
							this.editor
								.getShapeGeometry(s)
								.distanceToPoint(
									this.editor.getPointInShapeSpace(s, this.editor.inputs.currentPagePoint),
									true
								) >= 0
					)[0]

				if (
					!target ||
					!this.editor
						.getShapeUtil(target)
						.canBind({ bindingType: 'arrow', fromShapeType: 'arrow', toShapeType: target.type })
				) {
					this.cleanup('no target')
					return
				}

				const pageTransform = this.editor.getShapePageTransform(target)
				const exitPoint = pageTransform.applyToPoint(
					this.editor
						.getShapeGeometry(target)
						.nearestPoint(
							this.editor.getPointInShapeSpace(target, this.editor.inputs.currentPagePoint)
						)
				)

				const viewport = this.editor.getViewportPageBounds()

				const nearbyShapes = this.editor
					.getCurrentPageRenderingShapesSorted()
					.filter((s) => viewport.containsPoint(this.editor.getShapePageBounds(s)!.center))
					.filter((s) => s.id !== target.id)
					.filter((s) => s.type !== 'arrow')

				if (nearbyShapes.length === 0) {
					this.cleanup('no nearby shapes')
					return
				}

				const targetCenter = this.editor.getShapePageBounds(target)!.center
				for (const shape of nearbyShapes) {
					const center = this.editor.getShapePageBounds(shape)!.center
					const centersLine = new Edge2d({ start: targetCenter, end: center })
					const exitLine = new Edge2d({ start: exitPoint, end: center })

					const angleDiff = shortAngleDist(centersLine.u.toAngle(), exitLine.u.toAngle())
					const distInScreenSpace =
						centersLine.distanceToPoint(exitPoint) / this.editor.getZoomLevel()

					console.log({ angleDiff, distInScreenSpace })
					if (angleDiff > Math.PI / 6 || distInScreenSpace > 20) {
						continue
					}

					if (
						this.existingPair &&
						this.existingPair[0] === shape.id &&
						this.existingPair[1] === target.id
					) {
						return
					}
					this.existingPair = [shape.id, target.id]

					this.cleanup('match ' + shape.id)
					this.editor.setHintingShapes([shape, target])
					const id = (this.tempShapeId = createShapeId())
					this.editor.setCursor({ type: 'pointer' })
					this.editor.createShape({ type: 'arrow', id, meta: { bloop: true } })
					this.editor.createBindings([
						{
							fromId: id,
							toId: target.id,
							type: 'arrow',
							props: {
								terminal: 'start',
								isExact: false,
								isPrecise: false,
							},
						},
						{
							fromId: id,
							toId: shape.id,
							type: 'arrow',
							props: {
								terminal: 'end',
								isExact: false,
								isPrecise: false,
							},
						},
					])
					return
				}

				this.cleanup('no match')
				this.editor.setHintingShapes([target])
				const id = (this.tempShapeId = createShapeId())
				this.editor.setCursor({ type: 'pointer' })
				this.editor.createShape({
					type: 'arrow',
					id,
					meta: { bloop: true },
					props: {
						end: {
							x: this.editor.inputs.currentPagePoint.x,
							y: this.editor.inputs.currentPagePoint.y,
						},
					} satisfies Partial<TLArrowShapeProps>,
				})
				this.editor.createBindings([
					{
						fromId: id,
						toId: target.id,
						type: 'arrow',
						props: {
							terminal: 'start',
							isExact: false,
							isPrecise: false,
						},
					},
				])
			},
			{ history: 'ignore' }
		)
	}

	override onExit(): void {
		this.cleanup('exit')
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		if (info.key === 'Enter') {
			if (this.editor.getInstanceState().isReadonly) return null
			const onlySelectedShape = this.editor.getOnlySelectedShape()
			// If the only selected shape is editable, start editing it
			if (
				onlySelectedShape &&
				this.editor.getShapeUtil(onlySelectedShape).canEdit(onlySelectedShape)
			) {
				this.editor.setCurrentTool('select')
				this.editor.setEditingShape(onlySelectedShape.id)
				this.editor.root.getCurrent()?.transition('editing_shape', {
					...info,
					target: 'shape',
					shape: onlySelectedShape,
				})
			}
		}
	}
}
