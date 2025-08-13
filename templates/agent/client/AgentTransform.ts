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
	 * Ensure that a new simple shape is valid.
	 * If it isn't valid, fix it.
	 * @returns The sanitized shape.
	 */
	sanitizeNewShape(shape: ISimpleShape): ISimpleShape {
		if (shape.shapeId) {
			shape.shapeId = this.sanitizeNewShapeId(shape.shapeId)
		}

		if (shape._type === 'arrow') {
			if (shape.fromId) {
				shape.fromId = this.sanitizeExistingShapeId(shape.fromId)
			}
			if (shape.toId) {
				shape.toId = this.sanitizeExistingShapeId(shape.toId)
			}
		}

		shape = this.sanitizeShapeNumbers(shape)

		return shape
	}

	/**
	 * Ensure that an existing simple shape is valid.
	 * If it isn't valid, fix it.
	 * @returns The sanitized shape, or null if the shape is invalid.
	 */
	sanitizeExistingShape(shape: ISimpleShape): ISimpleShape | null {
		if (shape.shapeId) {
			const shapeId = this.sanitizeExistingShapeId(shape.shapeId)
			if (!shapeId) return null
			shape.shapeId = shapeId
		}

		if (shape._type === 'arrow') {
			if (shape.fromId) {
				shape.fromId = this.sanitizeExistingShapeId(shape.fromId)
			}
			if (shape.toId) {
				shape.toId = this.sanitizeExistingShapeId(shape.toId)
			}
		}

		shape = this.sanitizeShapeNumbers(shape)
		return shape
	}

	/**
	 * Ensure a shape ID does not have the 'shape:' prefix.
	 * @param id - The id to sanitize.
	 * @returns The sanitized id.
	 */
	sanitizeShapeIdPrefix(id: string): string {
		// The model shouldn't use the 'shape:' prefix, but remove it if it does by accident.
		return id.startsWith('shape:') ? id.slice('shape:'.length) : id
	}

	/**
	 * Ensure that a shape ID is valid and unique.
	 * @param id - The id to sanitize.
	 * @returns The sanitized id.
	 */
	sanitizeNewShapeId(id: string): string {
		id = this.sanitizeShapeIdPrefix(id)

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

	sanitizeExistingShapeIds(ids: string[]): string[] {
		return ids.map((id) => this.sanitizeExistingShapeId(id)).filter((v) => v !== null)
	}

	/**
	 * Ensure that an existing shape ID is valid.
	 * @param id - The id to sanitize.
	 * @returns The sanitized id.
	 */
	sanitizeExistingShapeId(id: string): string | null {
		id = this.sanitizeShapeIdPrefix(id)

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

	numberDiffMap = new Map<string, number>()

	sanitizeShapeNumbers(shape: ISimpleShape): ISimpleShape {
		// TODO check for cache hit in numberDiffMap first
		shape = this.roundAndSaveShapeCoordinates(shape)
		shape = this.roundAndSaveShapeSize(shape)
		return shape
	}

	roundAndSaveShapeCoordinates(shape: ISimpleShape): ISimpleShape {
		if (shape._type === 'arrow' || shape._type === 'line') {
			shape = this.roundAndSaveShapeNumberProperty(shape, 'x1')
			shape = this.roundAndSaveShapeNumberProperty(shape, 'y1')
			shape = this.roundAndSaveShapeNumberProperty(shape, 'x2')
			shape = this.roundAndSaveShapeNumberProperty(shape, 'y2')
		} else {
			shape = this.roundAndSaveShapeNumberProperty(shape, 'x')
			shape = this.roundAndSaveShapeNumberProperty(shape, 'y')
		}
		return shape
	}

	roundAndSaveShapeSize(shape: ISimpleShape): ISimpleShape {
		shape = this.roundAndSaveShapeNumberProperty(shape, 'width')
		shape = this.roundAndSaveShapeNumberProperty(shape, 'height')
		return shape
	}

	roundAndSaveShapeNumberProperty(
		shape: ISimpleShape,
		property: ISimpleShapeNumberKeys
	): ISimpleShape {
		if (!property) return shape
		const value = (shape as any)[property] as number
		if (value === undefined) return shape

		const diff = Math.round(value) - value
		;(shape as any)[property] = diff + value
		this.numberDiffMap.set(shape.shapeId + '_' + property, diff)
		return shape
	}

	roundBoxModel(boxModel: BoxModel): BoxModel {
		boxModel.x = Math.round(boxModel.x)
		boxModel.y = Math.round(boxModel.y)
		boxModel.w = Math.round(boxModel.w)
		boxModel.h = Math.round(boxModel.h)
		return boxModel
	}

	roundVecModel(vecModel: VecModel): VecModel {
		vecModel.x = Math.round(vecModel.x)
		vecModel.y = Math.round(vecModel.y)
		return vecModel
	}
}
