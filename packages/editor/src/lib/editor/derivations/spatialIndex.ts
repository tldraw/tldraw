import { RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import { TLPageId, TLShapeId, isShape, isShapeId } from '@tldraw/tlschema'
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

	private addElement(id: TLShapeId, a: Element[], existingBounds?: Box) {
		const e = this.getElement(id, existingBounds)
		if (!e) return
		a.push(e)
		this.shapesInTree.set(id, e)
	}

	private getElement(id: TLShapeId, existingBounds?: Box): Element | null {
		const bounds = existingBounds ?? this.editor.getShapeMaskedPageBounds(id)
		if (!bounds) return null
		return {
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
			id,
		}
	}

	private fromScratch(lastComputedEpoch: number) {
		this.lastPageId = this.editor.getCurrentPageId()
		this.shapesInTree = new Map<TLShapeId, Element>()
		const elementsToAdd: Element[] = []

		this.editor.getCurrentPageShapeIds().forEach((id) => {
			this.addElement(id, elementsToAdd)
		})

		this.rBush = new TldrawRBush().load(elementsToAdd)

		return lastComputedEpoch
	}

	private createSpatialIndex() {
		const shapeHistory = this.editor.store.query.filterHistory('shape')

		return computed<number>('spatialIndex', (prevValue, lastComputedEpoch) => {
			if (isUninitialized(prevValue)) {
				return this.fromScratch(lastComputedEpoch)
			}

			const diff = shapeHistory.getDiffSince(lastComputedEpoch)
			if (diff === RESET_VALUE) {
				return this.fromScratch(lastComputedEpoch)
			}

			const currentPageId = this.editor.getCurrentPageId()
			if (!this.lastPageId || this.lastPageId !== currentPageId) {
				return this.fromScratch(lastComputedEpoch)
			}

			let isDirty = false
			for (const changes of diff) {
				const elementsToAdd: Element[] = []
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
				for (const record of Object.values(changes.added)) {
					if (isShape(record)) {
						this.addElement(record.id, elementsToAdd)
					}
				}
				if (elementsToAdd.length) {
					this.rBush.load(elementsToAdd)
					isDirty = true
				}
			}
			const elementsToAdd: Element[] = []
			this.shapesInTree.forEach((element, id) => {
				const newBounds = this.editor.getShapeMaskedPageBounds(id)
				if (!newBounds) return
				if (
					element.minX !== newBounds.minX ||
					element.minY !== newBounds.minY ||
					element.maxX !== newBounds.maxX ||
					element.maxY !== newBounds.maxY
				) {
					this.shapesInTree.delete(id)
					this.rBush.remove(element)
					this.addElement(id, elementsToAdd, newBounds)
					isDirty = true
				}
			})
			if (elementsToAdd.length) {
				this.rBush.load(elementsToAdd)
				isDirty = true
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
			const isSame = prevValue.size === newValue.length && newValue.every((id) => prevValue.has(id))
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
				prevValue.size === nonVisibleShapes.length &&
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
