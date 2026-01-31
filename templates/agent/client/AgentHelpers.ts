import { BoxModel, createShapeId, Editor, TLShapeId, VecModel } from 'tldraw'
import { FocusedFill, FocusedFillSchema } from '../shared/format/FocusedFill'
import { FocusedShape } from '../shared/format/FocusedShape'
import { ContextItem } from '../shared/types/ContextItem'
import { SimpleShapeId } from '../shared/types/ids-schema'
import { TldrawAgent } from './agent/TldrawAgent'

/**
 * This class contains handles the transformations that happen throughout a
 * request. It contains helpers that can be used to change prompt parts
 * before they get sent to the model, as well as helpers that can be used to
 * change incoming actions as they get streamed back from the model.
 *
 * For example, `applyOffsetToShape` adjusts the position of a shape to make it
 * relative to the current chat origin. The `removeOffsetFromShape` method
 * reverses it. This is helpful because it helps to keep numbers low, which is
 * easier for the model to deal with.
 *
 * Many transformation methods save some state. For example, the
 * `ensureShapeIdIsUnique` method changes a shape's ID if it's not unique, and
 * it saves a record of this change so that further actions can continue to
 * refer to the shape by its untransformed ID.
 */
export class AgentHelpers {
	/**
	 * The agent that the this intance of AgentHelpers is for.
	 */
	agent: TldrawAgent

	/**
	 * The editor that the this intance of AgentHelpers is for.
	 */
	editor: Editor

	constructor(agent: TldrawAgent) {
		this.agent = agent
		this.editor = agent.editor
		const origin = agent.chatOrigin.getOrigin()
		this.offset = {
			x: -origin.x,
			y: -origin.y,
		}
	}

	/**
	 * The offset of the current request from the chat origin.
	 */
	offset: VecModel = { x: 0, y: 0 }

	/**
	 * A map of shape ids that have been transformed as part of this request.
	 * The key is the original id, and the value is the transformed id.
	 */
	shapeIdMap = new Map<string, string>()

	/**
	 * A map of rounding diffs, stored by key.
	 * These are used to restore the original values of rounded numbers.
	 */
	roundingDiffMap = new Map<string, number>()

	/**
	 * Apply the offset of this request to a position.
	 */
	applyOffsetToVec(position: VecModel): VecModel {
		return {
			x: position.x + this.offset.x,
			y: position.y + this.offset.y,
		}
	}

	/**
	 * Remove the offset of this request from a position.
	 */
	removeOffsetFromVec(position: VecModel): VecModel {
		return {
			x: position.x - this.offset.x,
			y: position.y - this.offset.y,
		}
	}

	/**
	 * Apply the offset of this request to a box.
	 */
	applyOffsetToBox(box: BoxModel): BoxModel {
		return {
			x: box.x + this.offset.x,
			y: box.y + this.offset.y,
			w: box.w,
			h: box.h,
		}
	}

	/**
	 * Remove the offset of this request from a box.
	 */
	removeOffsetFromBox(box: BoxModel): BoxModel {
		return {
			x: box.x - this.offset.x,
			y: box.y - this.offset.y,
			w: box.w,
			h: box.h,
		}
	}

	/**
	 * Apply the offset of this request to a shape.
	 */
	applyOffsetToShape(shape: FocusedShape): FocusedShape {
		if ('x1' in shape) {
			return {
				...shape,
				x1: shape.x1 + this.offset.x,
				y1: shape.y1 + this.offset.y,
				x2: shape.x2 + this.offset.x,
				y2: shape.y2 + this.offset.y,
			}
		}
		if ('x' in shape) {
			return {
				...shape,
				x: shape.x + this.offset.x,
				y: shape.y + this.offset.y,
			}
		}
		return shape
	}

	/**
	 * Apply the offset of this request to a shape partial.
	 */
	applyOffsetToShapePartial(shape: Partial<FocusedShape>): Partial<FocusedShape> {
		const result = { ...shape }
		if ('x' in result && result.x !== undefined) {
			;(result as any).x = result.x + this.offset.x
		}
		if ('y' in result && result.y !== undefined) {
			;(result as any).y = result.y + this.offset.y
		}
		if ('x1' in result && result.x1 !== undefined) {
			;(result as any).x1 = result.x1 + this.offset.x
		}
		if ('y1' in result && result.y1 !== undefined) {
			;(result as any).y1 = result.y1 + this.offset.y
		}
		if ('x2' in result && result.x2 !== undefined) {
			;(result as any).x2 = result.x2 + this.offset.x
		}
		if ('y2' in result && result.y2 !== undefined) {
			;(result as any).y2 = result.y2 + this.offset.y
		}
		return result
	}

	/**
	 * Remove the offset of this request from a shape partial.
	 */
	removeOffsetFromShapePartial(shape: Partial<FocusedShape>): Partial<FocusedShape> {
		const result = { ...shape }
		if ('x' in result && result.x !== undefined) {
			;(result as any).x = result.x - this.offset.x
		}
		if ('y' in result && result.y !== undefined) {
			;(result as any).y = result.y - this.offset.y
		}
		if ('x1' in result && result.x1 !== undefined) {
			;(result as any).x1 = result.x1 - this.offset.x
		}
		if ('y1' in result && result.y1 !== undefined) {
			;(result as any).y1 = result.y1 - this.offset.y
		}
		if ('x2' in result && result.x2 !== undefined) {
			;(result as any).x2 = result.x2 - this.offset.x
		}
		if ('y2' in result && result.y2 !== undefined) {
			;(result as any).y2 = result.y2 - this.offset.y
		}
		return result
	}

	/**
	 * Remove the offset of this request from a shape.
	 */
	removeOffsetFromShape(shape: FocusedShape): FocusedShape {
		if ('x1' in shape) {
			return {
				...shape,
				x1: shape.x1 - this.offset.x,
				y1: shape.y1 - this.offset.y,
				x2: shape.x2 - this.offset.x,
				y2: shape.y2 - this.offset.y,
			}
		}
		if ('x' in shape) {
			return {
				...shape,
				x: shape.x - this.offset.x,
				y: shape.y - this.offset.y,
			}
		}
		return shape
	}

	/**
	 * Apply the offset of this request to a context item.
	 */
	applyOffsetToContextItem(contextItem: ContextItem) {
		switch (contextItem.type) {
			case 'shape': {
				contextItem.shape = this.applyOffsetToShape(contextItem.shape)
				return contextItem
			}
			case 'shapes': {
				contextItem.shapes = contextItem.shapes.map((shape) => {
					return this.applyOffsetToShape(shape)
				})
				return contextItem
			}
			case 'area': {
				contextItem.bounds = this.applyOffsetToBox(contextItem.bounds)
				return contextItem
			}
			case 'point': {
				contextItem.point = this.applyOffsetToVec(contextItem.point)
				return contextItem
			}
		}
	}

	/**
	 * Round the numbers of a context item.
	 */
	roundContextItem(contextItem: ContextItem) {
		switch (contextItem.type) {
			case 'shape': {
				contextItem.shape = this.roundShape(contextItem.shape)
				return contextItem
			}
			case 'shapes': {
				contextItem.shapes = contextItem.shapes.map((shape) => {
					return this.roundShape(shape)
				})
				return contextItem
			}
			case 'area': {
				contextItem.bounds = this.roundBox(contextItem.bounds)
				return contextItem
			}
			case 'point': {
				contextItem.point = this.roundVec(contextItem.point)
				return contextItem
			}
		}
	}

	/**
	 * Ensure that a shape ID is unique.
	 * @param id - The id to check (should be a SimpleShapeId from the model, not a TLShapeId).
	 * @returns The unique id (always without the "shape:" prefix).
	 */
	ensureShapeIdIsUnique(id = 'shape' as SimpleShapeId): SimpleShapeId {
		// todo: remove default and have a better handling of cases where id is undefined

		const { editor } = this.agent
		// Defensively strip the prefix in case the model incorrectly includes it

		// Ensure the id is unique by incrementing a number at the end
		let newId = id
		let existingShape = editor.getShape(`shape:${newId}` as TLShapeId)
		while (existingShape) {
			newId = /^.*(\d+)$/.exec(newId)?.[1]
				? (newId.replace(/(\d+)$/, (m) => {
						return (+m + 1).toString()
					}) as SimpleShapeId)
				: (`${newId}-1` as SimpleShapeId)
			existingShape = editor.getShape(`shape:${newId}` as TLShapeId)
		}

		// If the id was transformed, track it so that future events can refer to it by its original id.
		if (id !== newId) {
			this.shapeIdMap.set(id, newId)
		}

		return newId as SimpleShapeId
	}

	/**
	 * Ensure that a shape ID refers to a real shape.
	 * @param id - The id to check.
	 * @returns The real id, or null if the shape doesn't exist.
	 */
	ensureShapeIdExists(id: SimpleShapeId): SimpleShapeId | null {
		const { editor } = this.agent

		// If there's already a transformed ID, use that
		const existingId = this.shapeIdMap.get(id)
		if (existingId) {
			return existingId as SimpleShapeId
		}

		// If there's an existing shape with this ID, use that
		const existingShape = editor.getShape(createShapeId(id))
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
	ensureShapeIdsExist(ids: SimpleShapeId[]): SimpleShapeId[] {
		return ids.map((id) => this.ensureShapeIdExists(id)).filter((v) => v !== null)
	}

	/**
	 * Round the coordinates, width, and height of a focused shape.
	 * Save the diffs so that they can be restored later.
	 * @param shape - The shape to round.
	 * @returns The rounded shape.
	 */
	roundShape(shape: FocusedShape): FocusedShape {
		if ('x1' in shape) {
			shape = this.roundProperty(shape, 'x1')
			shape = this.roundProperty(shape, 'y1')
			shape = this.roundProperty(shape, 'x2')
			shape = this.roundProperty(shape, 'y2')
		} else if ('x' in shape) {
			shape = this.roundProperty(shape, 'x')
			shape = this.roundProperty(shape, 'y')
		}

		if ('w' in shape) {
			shape = this.roundProperty(shape, 'w')
			shape = this.roundProperty(shape, 'h')
		}

		return shape
	}

	/**
	 * Round the coordinates, width, and height of a focused shape partial.
	 * Save the diffs so that they can be restored later.
	 * @param shape - The shape partial to round.
	 * @returns The rounded shape partial.
	 */
	roundShapePartial(shape: Partial<FocusedShape>): Partial<FocusedShape> {
		for (const prop of ['x1', 'y1', 'x2', 'y2', 'x', 'y', 'w', 'h'] as const) {
			if (prop in shape) {
				shape = this.roundProperty(shape, prop as keyof Partial<FocusedShape>)
			}
		}
		return shape
	}

	/**
	 * Reverse the rounding of a shape that we did earlier.
	 * This ensures that shape's don't do a tiny jitter when they are updated.
	 * @param shape - The shape to unround.
	 * @returns The unrounded shape.
	 */
	unroundShape(shape: FocusedShape): FocusedShape {
		if ('x1' in shape) {
			shape = this.unroundProperty(shape, 'x1')
			shape = this.unroundProperty(shape, 'y1')
			shape = this.unroundProperty(shape, 'x2')
			shape = this.unroundProperty(shape, 'y2')
		} else if ('x' in shape) {
			shape = this.unroundProperty(shape, 'x')
			shape = this.unroundProperty(shape, 'y')
		}

		if ('w' in shape) {
			shape = this.unroundProperty(shape, 'w')
			shape = this.unroundProperty(shape, 'h')
		}
		return shape
	}

	/**
	 * Round a number and save its diff so that it can be restored later.
	 * @param number - The number to round.
	 * @param key - The key to save the diff under.
	 * @returns The rounded number.
	 */
	roundAndSaveNumber(number: number, key: string): number {
		const roundedNumber = Math.round(number)
		const diff = roundedNumber - number
		this.roundingDiffMap.set(key, diff)
		return roundedNumber
	}

	/**
	 * Reverse the rounding of a number and restore the original value.
	 * @param number - The number to unround.
	 * @param key - The key to restore the diff from.
	 * @returns The unrounded number.
	 */
	unroundAndRestoreNumber(number: number, key: string): number {
		const diff = this.roundingDiffMap.get(key)
		if (diff === undefined) return number
		return number + diff
	}

	/**
	 * Round a number property of a shape, and save the diff so that it can be restored later.
	 * @param shape - The shape to round.
	 * @param property - The property to round.
	 * @returns The rounded shape.
	 */
	roundProperty<T extends Partial<FocusedShape>>(shape: T, property: keyof T): T {
		if (typeof shape[property] !== 'number') return shape

		const value = shape[property]
		const key = `${shape.shapeId}_${property as string}`
		const roundedValue = this.roundAndSaveNumber(value, key)

		;(shape[property] as number) = roundedValue
		return shape
	}

	/**
	 * Reverse the rounding of a number property of a shape, and restore the original value.
	 * @param shape - The shape to unround.
	 * @param property - The property to unround.
	 * @returns The unrounded shape.
	 */
	unroundProperty<T extends FocusedShape>(shape: T, property: keyof T): T {
		if (typeof shape[property] !== 'number') return shape

		const key = `${shape.shapeId}_${property as string}`
		const diff = this.roundingDiffMap.get(key)
		if (diff === undefined) return shape
		;(shape[property] as number) += diff
		return shape
	}

	/**
	 * Ensure that a value is a number.
	 * Used for checking incoming data from the model.
	 * @returns The number, or null if the value is not a number.
	 */
	ensureValueIsNumber(value: any): number | null {
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

	/**
	 * Ensure that a value is a vector.
	 * Used for checking incoming data from the model.
	 * @returns The vector, or null if the value is not a vector.
	 */
	ensureValueIsVec(value: any): VecModel | null {
		if (!value) return null
		if (typeof value !== 'object') return null
		if (!('x' in value) || !('y' in value)) return null

		const x = this.ensureValueIsNumber(value.x)
		const y = this.ensureValueIsNumber(value.y)
		if (x === null || y === null) return null
		return { x, y }
	}

	/**
	 * Ensure that a value is a boolean.
	 * Used for checking incoming data from the model.
	 * @returns The boolean, or null if the value is not a boolean.
	 */
	ensureValueIsBoolean(value: any): boolean | null {
		if (typeof value === 'boolean') {
			return value
		}

		if (typeof value === 'number') {
			return value > 0
		}

		if (typeof value === 'string') {
			return value !== 'false'
		}

		return null
	}

	/**
	 * Ensure that a value is a focused fill.
	 * Used for checking incoming data from the model.
	 * @returns The focused fill, or null if the value is not a focused fill.
	 */
	ensureValueIsFocusedFill(value: any): FocusedFill | null {
		const focusedFill = FocusedFillSchema.safeParse(value)
		if (focusedFill.success) {
			return focusedFill.data
		}
		return null
	}

	/**
	 * Round the corners of a box.
	 */
	roundBox(boxModel: BoxModel): BoxModel {
		boxModel.x = Math.round(boxModel.x)
		boxModel.y = Math.round(boxModel.y)
		boxModel.w = Math.round(boxModel.w)
		boxModel.h = Math.round(boxModel.h)
		return boxModel
	}

	/**
	 * Round the numbers of a vector.
	 */
	roundVec(vecModel: VecModel): VecModel {
		vecModel.x = Math.round(vecModel.x)
		vecModel.y = Math.round(vecModel.y)
		return vecModel
	}
}
