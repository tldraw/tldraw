import { BoxModel, Editor, TLShapeId, VecModel } from 'tldraw'
import { ISimpleShape } from '../worker/simple/SimpleShape'

/**
 * A class that helps to transform events received from the model.
 */
export class AgentTransform {
	constructor(public editor: Editor) {}

	/**
	 * A map of shape ids that have been transformed.
	 * The key is the original id, and the value is the transformed id.
	 */
	shapeIdMap = new Map<string, string>()

	/**
	 * A map of rounding diffs, stored by key.
	 * These are used to restore the original values of rounded numbers.
	 */
	roundingDiffMap = new Map<string, number>()

	/**
	 * Ensure that a shape ID is unique.
	 * @param id - The id to check.
	 * @returns The unique id.
	 */
	ensureShapeIdIsUnique(id: string): string {
		// Ensure the id is unique by incrementing a number at the end
		let newId = id
		let existingShape = this.editor.getShape(`shape:${newId}` as TLShapeId)
		while (existingShape) {
			newId = /^.*(\d+)$/.exec(newId)?.[1]
				? newId.replace(/(\d+)(?=\D?)$/, (m) => {
						return (+m + 1).toString()
					})
				: `${newId}-1`
			existingShape = this.editor.getShape(`shape:${newId}` as TLShapeId)
		}

		// If the id was transformed, track it so that future events can refer to it by its original id.
		if (id !== newId) {
			this.shapeIdMap.set(id, newId)
		}

		return newId
	}

	/**
	 * Ensure that a shape ID refers to a real shape.
	 * @param id - The id to check.
	 * @returns The real id, or null if the shape doesn't exist.
	 */
	ensureShapeIdIsReal(id: string): string | null {
		// If there's already a transformed ID, use that
		const existingId = this.shapeIdMap.get(id)
		if (existingId) {
			return existingId
		}

		// If there's an existing shape with this ID, use that
		const existingShape = this.editor.getShape(`shape:${id}` as TLShapeId)
		if (existingShape) {
			return id
		}

		// Otherwise, give up
		return null
	}

	/**
	 * Ensure that all shape IDs refer to real shapes.
	 * @param ids - An array of ids to check.
	 * @returns The array of ids, with imaginary ids removed.
	 */
	ensureShapeIdsAreReal(ids: string[]): string[] {
		return ids.map((id) => this.ensureShapeIdIsReal(id)).filter((v) => v !== null)
	}

	/**
	 * Round the numbers of a shape, and save the diffs so that it can be restored later.
	 * @param shape - The shape to round.
	 * @returns The rounded shape.
	 */
	roundShape(shape: ISimpleShape): ISimpleShape {
		if (shape._type === 'arrow' || shape._type === 'line') {
			shape = this.roundProperty(shape, 'x1')
			shape = this.roundProperty(shape, 'y1')
			shape = this.roundProperty(shape, 'x2')
			shape = this.roundProperty(shape, 'y2')
		} else {
			shape = this.roundProperty(shape, 'x')
			shape = this.roundProperty(shape, 'y')
		}

		if ('width' in shape) {
			shape = this.roundProperty(shape, 'width')
			shape = this.roundProperty(shape, 'height')
		}

		return shape
	}

	/**
	 * Reverse the rounding of a shape that we did earlier.
	 * This ensures that shape's don't do a tiny jitter when they are updated.
	 * @param shape - The shape to unround.
	 * @returns The unrounded shape.
	 */
	unroundShape(shape: ISimpleShape): ISimpleShape {
		if (shape._type === 'arrow' || shape._type === 'line') {
			shape = this.unroundProperty(shape, 'x1')
			shape = this.unroundProperty(shape, 'y1')
			shape = this.unroundProperty(shape, 'x2')
			shape = this.unroundProperty(shape, 'y2')
		} else {
			shape = this.unroundProperty(shape, 'x')
			shape = this.unroundProperty(shape, 'y')
		}
		if ('width' in shape) {
			shape = this.unroundProperty(shape, 'width')
			shape = this.unroundProperty(shape, 'height')
		}
		return shape
	}

	/**
	 * Round a number property of a shape, and save the diff so that it can be restored later.
	 * @param shape - The shape to round.
	 * @param property - The property to round.
	 * @returns The rounded shape.
	 */
	roundProperty<T extends ISimpleShape>(shape: T, property: keyof T): T {
		if (typeof shape[property] !== 'number') return shape

		const value = shape[property]
		const roundedValue = Math.round(value)
		const diff = roundedValue - value
		;(shape[property] as number) = roundedValue

		const key = `${shape.shapeId}_${property as string}`
		this.roundingDiffMap.set(key, diff)
		return shape
	}

	/**
	 * Reverse the rounding of a number property of a shape, and restore the original value.
	 * @param shape - The shape to unround.
	 * @param property - The property to unround.
	 * @returns The unrounded shape.
	 */
	unroundProperty<T extends ISimpleShape>(shape: T, property: keyof T): T {
		if (typeof shape[property] !== 'number') return shape

		const key = `${shape.shapeId}_${property as string}`
		const diff = this.roundingDiffMap.get(key)
		if (diff === undefined) return shape
		;(shape[property] as number) += diff
		return shape
	}
}

export function roundBox(boxModel: BoxModel): BoxModel {
	boxModel.x = Math.round(boxModel.x)
	boxModel.y = Math.round(boxModel.y)
	boxModel.w = Math.round(boxModel.w)
	boxModel.h = Math.round(boxModel.h)
	return boxModel
}

export function roundVec(vecModel: VecModel): VecModel {
	vecModel.x = Math.round(vecModel.x)
	vecModel.y = Math.round(vecModel.y)
	return vecModel
}

export function ensureValueIsNumber(value: any): number | null {
	if (typeof value === 'number') {
		return value
	}

	if (typeof value === 'string') {
		const parsedValue = parseFloat(value)
		if (isNaN(parsedValue)) {
			return null
		}
		return parsedValue
	}

	return null
}

export function ensureValueIsVec(value: any): VecModel | null {
	if (!value) return null
	if (typeof value !== 'object') return null
	if (!('x' in value) || !('y' in value)) return null

	const x = ensureValueIsNumber(value.x)
	const y = ensureValueIsNumber(value.y)
	if (x === null || y === null) return null
	return { x, y }
}

export function ensureValueIsBoolean(value: any): boolean | null {
	if (typeof value === 'boolean') {
		return value
	}
	return null
}

export function removeShapeIdPrefix(id: TLShapeId): string {
	return id.slice('shape:'.length)
}
