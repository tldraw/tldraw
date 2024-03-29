import { RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import { TLPageId, TLShape, TLShapeId, isShape, isShapeId } from '@tldraw/tlschema'
import RBush from 'rbush'
import { Box } from '../../primitives/Box'
import { Editor } from '../Editor'

type Element = {
	minX: number
	minY: number
	maxX: number
	maxY: number
	id: TLShapeId
}

class TldrawRBush extends RBush<Element> {}

export class SpatialIndex {
	shapesInTree = new Map<TLShapeId, Element>()
	rBush = new TldrawRBush()
	lastPageId: TLPageId | null

	constructor(private editor: Editor) {
		this.lastPageId = editor.getCurrentPageId()
	}

	private getElement(shape: TLShape): Element | null {
		const bounds = this.editor.getShapeMaskedPageBounds(shape)
		if (!bounds) return null
		return {
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
			id: shape.id,
		}
	}

	private addElementToArray(shape: TLShape, a: Element[]): Element | null {
		const e = this.getElement(shape)
		if (!e) return null
		a.push(e)
		return e
	}

	@computed
	getShapesInRenderingBoundsExpanded() {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = this.rebrushIncremental().get()
		const bounds = this.editor.getRenderingBoundsExpanded()
		return this.searchTree(this.rBush, bounds)
	}

	getShapesInsideBounds(bounds: Box): TLShapeId[] {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = this.rebrushIncremental().get()
		return this.searchTree(this.rBush, bounds)
	}

	@computed
	rebrushIncremental() {
		return this._rebrushIncremental()
	}

	_rebrushIncremental() {
		const { store } = this.editor
		const shapeHistory = store.query.filterHistory('shape')

		return computed<{ epoch: number }>('getShapesInView', (prevValue, lastComputedEpoch) => {
			let isDirty = false
			const currentPageId = this.editor.getCurrentPageId()
			const shapes = this.editor.getCurrentPageShapes()

			if (isUninitialized(prevValue)) {
				this.lastPageId = currentPageId
				return this.fromScratch(shapes, lastComputedEpoch)
			}
			const diff = shapeHistory.getDiffSince(lastComputedEpoch)

			if (diff === RESET_VALUE) {
				this.lastPageId = currentPageId
				return this.fromScratch(shapes, lastComputedEpoch)
			}

			if (this.lastPageId !== currentPageId) {
				this.lastPageId = currentPageId
				return this.fromScratch(shapes, lastComputedEpoch)
			}

			const elementsToAdd: Element[] = []
			for (const changes of diff) {
				for (const record of Object.values(changes.added)) {
					if (isShape(record)) {
						const e = this.addElementToArray(record, elementsToAdd)
						if (!e) continue
						this.shapesInTree.set(record.id, e)
					}
				}

				for (const [_from, to] of Object.values(changes.updated)) {
					if (isShape(to)) {
						const currentElement = this.shapesInTree.get(to.id)
						if (currentElement) {
							const newBounds = this.editor.getShapeMaskedPageBounds(to.id)
							if (
								newBounds?.minX === currentElement.minX &&
								newBounds.minY === currentElement.minY &&
								newBounds?.maxX === currentElement.maxX &&
								newBounds.maxY === currentElement.maxY
							) {
								continue
							}
							this.shapesInTree.delete(to.id)
							this.rBush.remove(currentElement)
						}
						const newE = this.getElement(to)
						if (!newE) continue
						this.shapesInTree.set(to.id, newE)
						elementsToAdd.push(newE)
					}
				}
				this.rBush.load(elementsToAdd)
				if (elementsToAdd.length) {
					isDirty = true
				}

				for (const id of Object.keys(changes.removed)) {
					if (isShapeId(id)) {
						const currentElement = this.shapesInTree.get(id)
						if (currentElement) {
							this.shapesInTree.delete(id)
							this.rBush.remove(currentElement)
							isDirty = true
						}
					}
				}
			}
			return isDirty ? { epoch: lastComputedEpoch } : prevValue
		})
	}

	private fromScratch(shapes: TLShape[], epoch: number) {
		this.rBush.clear()
		this.shapesInTree = new Map<TLShapeId, Element>()
		const elementsToAdd: Element[] = []

		for (let i = 0; i < shapes.length; i++) {
			const shape = shapes[i]
			const e = this.addElementToArray(shape, elementsToAdd)
			if (!e) continue
			this.shapesInTree.set(shape.id, e)
			elementsToAdd.push(e)
		}

		this.rBush.load(elementsToAdd)
		return { epoch }
	}

	private searchTree(tree: TldrawRBush, renderingBounds: Box): TLShapeId[] {
		return tree
			.search({
				minX: renderingBounds.x,
				minY: renderingBounds.y,
				maxX: renderingBounds.x + renderingBounds.width,
				maxY: renderingBounds.y + renderingBounds.height,
			})
			.map((b) => b.id)
	}
}
