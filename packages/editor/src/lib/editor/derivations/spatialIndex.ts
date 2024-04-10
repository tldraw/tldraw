import { RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import { TLShape, TLShapeId, isShape, isShapeId } from '@tldraw/tlschema'
import RBush from 'rbush'
import { Editor } from '../Editor'

type Element = {
	minX: number
	minY: number
	maxX: number
	maxY: number
	id: TLShapeId
}

class TldrawRBush extends RBush<Element> {}
function addElementToArray(editor: Editor, shape: TLShape, a: Element[]): Element | null {
	const e = getElement(editor, shape)
	if (!e) return null
	a.push(e)
	return e
}

function getElement(editor: Editor, shape: TLShape): Element | null {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	if (!bounds) return null
	return {
		minX: bounds.minX,
		minY: bounds.minY,
		maxX: bounds.maxX,
		maxY: bounds.maxY,
		id: shape.id,
	}
}

export function createSpatialIndex(editor: Editor) {
	const shapeHistory = editor.store.query.filterHistory('shape')
	let lastPageId = editor.getCurrentPageId()
	let shapesInTree = new Map<TLShapeId, Element>()
	let rBush = new TldrawRBush()

	function fromScratch(shapes: TLShape[], lastComputedEpoch: number) {
		console.log('fromScratch')
		lastPageId = editor.getCurrentPageId()
		shapesInTree = new Map<TLShapeId, Element>()
		const elementsToAdd: Element[] = []

		for (let i = 0; i < shapes.length; i++) {
			const shape = shapes[i]
			const e = addElementToArray(editor, shape, elementsToAdd)
			if (!e) continue
			shapesInTree.set(shape.id, e)
			elementsToAdd.push(e)
		}
		rBush = new TldrawRBush().load(elementsToAdd)
		return { rBush, lastComputedEpoch }
	}

	return computed<{ rBush: TldrawRBush; lastComputedEpoch: number }>(
		'spatialIndex',
		(prevValue, lastComputedEpoch) => {
			let isDirty = false
			const currentPageId = editor.getCurrentPageId()
			const shapes = editor.getCurrentPageShapes()
			console.log(shapes.length)

			if (isUninitialized(prevValue)) {
				return fromScratch(shapes, lastComputedEpoch)
			}
			const diff = shapeHistory.getDiffSince(lastComputedEpoch)

			if (diff === RESET_VALUE) {
				return fromScratch(shapes, lastComputedEpoch)
			}

			if (lastPageId !== currentPageId) {
				return fromScratch(shapes, lastComputedEpoch)
			}
			console.log('incremental')

			const elementsToAdd: Element[] = []
			for (const changes of diff) {
				for (const record of Object.values(changes.added)) {
					if (isShape(record)) {
						const e = addElementToArray(editor, record, elementsToAdd)
						if (!e) continue
						shapesInTree.set(record.id, e)
					}
				}

				for (const [_from, to] of Object.values(changes.updated)) {
					if (isShape(to)) {
						const currentElement = shapesInTree.get(to.id)
						if (currentElement) {
							const newBounds = editor.getShapeMaskedPageBounds(to.id)
							if (
								newBounds?.minX === currentElement.minX &&
								newBounds.minY === currentElement.minY &&
								newBounds?.maxX === currentElement.maxX &&
								newBounds.maxY === currentElement.maxY
							) {
								continue
							}
							shapesInTree.delete(to.id)
							rBush.remove(currentElement)
						}
						const newE = getElement(editor, to)
						if (!newE) continue
						shapesInTree.set(to.id, newE)
						elementsToAdd.push(newE)
					}
				}
				rBush.load(elementsToAdd)
				if (elementsToAdd.length) {
					isDirty = true
				}
				for (const id of Object.keys(changes.removed)) {
					if (isShapeId(id)) {
						const currentElement = shapesInTree.get(id)
						if (currentElement) {
							shapesInTree.delete(id)
							rBush.remove(currentElement)
							isDirty = true
						}
					}
				}
			}
			return isDirty ? { rBush, lastComputedEpoch } : prevValue
		}
	)
}
