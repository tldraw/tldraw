import { BoxModel, Editor, TLShapeId, VecModel } from 'tldraw'
import { ISimpleShape } from '../worker/simple/SimpleShape'

// Utility type to extract keys that have number values from any member of a union
type NumberKeys<T> = T extends any
	? {
			[K in keyof T]: T[K] extends number ? K : never
		}[keyof T]
	: never

type ISimpleShapeNumberKeys = NumberKeys<ISimpleShape>

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
			shape = this.roundNumberProperty(shape, 'x1')
			shape = this.roundNumberProperty(shape, 'y1')
			shape = this.roundNumberProperty(shape, 'x2')
			shape = this.roundNumberProperty(shape, 'y2')
		} else {
			shape = this.roundNumberProperty(shape, 'x')
			shape = this.roundNumberProperty(shape, 'y')
		}

		shape = this.roundNumberProperty(shape, 'width')
		shape = this.roundNumberProperty(shape, 'height')
		return shape
	}

	/**
	 * Round a number property of a shape, and save the diff so that it can be restored later.
	 * @param shape - The shape to round.
	 * @param property - The property to round.
	 * @returns The rounded shape.
	 */
	roundNumberProperty(shape: ISimpleShape, property: ISimpleShapeNumberKeys): ISimpleShape {
		if (!property) return shape
		const value = (shape as any)[property] as number
		if (value === undefined) return shape

		const diff = Math.round(value) - value
		;(shape as any)[property] = diff + value
		this.roundingDiffMap.set(shape.shapeId + '_' + property, diff)
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
