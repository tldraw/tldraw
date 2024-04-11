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
	private readonly spatialIndex: ReturnType<typeof this.createSpatialIndex>
	private lastPageId: TLPageId | null = null
	private shapesInTree: Map<TLShapeId, Element>
	private rBush: TldrawRBush

	constructor(private editor: Editor) {
		this.spatialIndex = this.createSpatialIndex()
		this.shapesInTree = new Map<TLShapeId, Element>()
		this.rBush = new TldrawRBush()
	}

	private addElementToArray(shape: TLShape, a: Element[]): Element | null {
		const e = this.getElement(shape)
		if (!e) return null
		a.push(e)
		return e
	}

	private getElement(shape: TLShape, existingBounds?: Box): Element | null {
		const bounds = existingBounds ?? this.editor.getShapeMaskedPageBounds(shape)
		if (!bounds) return null
		return {
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
			id: shape.id,
		}
	}

	private fromScratch(shapes: TLShape[], lastComputedEpoch: number) {
		this.lastPageId = this.editor.getCurrentPageId()
		this.shapesInTree = new Map<TLShapeId, Element>()
		const elementsToAdd: Element[] = []

		for (let i = 0; i < shapes.length; i++) {
			const shape = shapes[i]
			const e = this.addElementToArray(shape, elementsToAdd)
			if (!e) continue
			this.shapesInTree.set(shape.id, e)
		}
		this.rBush = new TldrawRBush().load(elementsToAdd)
		return lastComputedEpoch
	}

	private createSpatialIndex() {
		const shapeHistory = this.editor.store.query.filterHistory('shape')

		return computed<number>('spatialIndex', (prevValue, lastComputedEpoch) => {
			let isDirty = false
			const currentPageId = this.editor.getCurrentPageId()
			const shapes = this.editor.getCurrentPageShapes()

			if (isUninitialized(prevValue)) {
				return this.fromScratch(shapes, lastComputedEpoch)
			}
			const diff = shapeHistory.getDiffSince(lastComputedEpoch)

			if (diff === RESET_VALUE) {
				return this.fromScratch(shapes, lastComputedEpoch)
			}

			if (!this.lastPageId || this.lastPageId !== currentPageId) {
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
						const newBounds = this.editor.getShapeMaskedPageBounds(to.id)
						if (currentElement) {
							if (
								newBounds?.minX === currentElement.minX &&
								newBounds.minY === currentElement.minY &&
								newBounds.maxX === currentElement.maxX &&
								newBounds.maxY === currentElement.maxY
							) {
								continue
							}
							this.shapesInTree.delete(to.id)
							this.rBush.remove(currentElement)
						}
						const newE = this.getElement(to, newBounds)
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
			return isDirty ? lastComputedEpoch : prevValue
		})
	}

	@computed
	private _getVisibleShapes() {
		return computed<Set<TLShapeId>>('visible shapes', (prevValue) => {
			// Make sure the spatial index is up to date
			const _index = this.spatialIndex.get()
			const newValue = this.rBush.search(this.editor.getViewportPageBounds()).map((s) => s.id)
			if (isUninitialized(prevValue)) {
				return new Set(newValue)
			}
			const isSame =
				prevValue && prevValue.size === newValue.length && newValue.every((id) => prevValue.has(id))
			return isSame ? prevValue : new Set(newValue)
		})
	}

	@computed
	getVisibleShapes() {
		return this._getVisibleShapes().get()
	}

	@computed
	_getNotVisibleShapes() {
		return computed<Set<TLShapeId>>('not visible shapes', (prevValue) => {
			const visibleShapes = this._getVisibleShapes().get()
			const pageShapes = this.editor.getCurrentPageShapeIds()
			const nonVisibleShapes = [...pageShapes].filter((id) => !visibleShapes.has(id))
			if (isUninitialized(prevValue)) return new Set(nonVisibleShapes)
			const isSame =
				nonVisibleShapes.length === prevValue.size &&
				nonVisibleShapes.every((id) => prevValue.has(id))
			return isSame ? prevValue : new Set(nonVisibleShapes)
		})
	}

	@computed
	getNotVisibleShapes() {
		return this._getNotVisibleShapes().get()
	}

	getShapeIdsInsideBounds(bounds: Box) {
		// Make sure the spatial index is up to date
		const _index = this.spatialIndex.get()
		return this.rBush.search(bounds).map((s) => s.id)
	}
}
