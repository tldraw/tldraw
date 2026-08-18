import { BoxModel, createShapeId, Editor, TLShapeId, VecModel } from 'tldraw'
import { FocusedFill, FocusedFillSchema } from '../shared/format/FocusedFill'
import { FocusedShape } from '../shared/format/FocusedShape'
import { ContextItem } from '../shared/types/ContextItem'
import { SimpleShapeId } from '../shared/types/ids-schema'
import { TldrawAgent } from './agent/TldrawAgent'

const SHAPE_POSITION_PROPS = ['x', 'y', 'x1', 'y1', 'x2', 'y2'] as const
const SHAPE_NUMBER_PROPS = [...SHAPE_POSITION_PROPS, 'w', 'h'] as const

/**
 * Per-request transformations applied to prompt parts on the way to the model
 * and to actions on the way back.
 *
 * Positions are sent relative to the chat origin (`applyOffsetTo*` /
 * `removeOffsetFrom*`) and rounded (`round*` / `unround*`) to keep numbers
 * small for the model. Both are reversible: rounding diffs and remapped shape
 * ids are remembered so later actions can still refer to the untransformed
 * values.
 */
export class AgentHelpers {
	agent: TldrawAgent
	editor: Editor

	constructor(agent: TldrawAgent) {
		this.agent = agent
		this.editor = agent.editor
		const origin = agent.chatOrigin.getOrigin()
		this.offset = { x: -origin.x, y: -origin.y }
	}

	/** The offset of the current request from the chat origin. */
	offset: VecModel = { x: 0, y: 0 }

	/** Original shape id -> the unique id it was remapped to. */
	shapeIdMap = new Map<string, string>()

	/** Rounding diffs by `${shapeId}_${property}`, used to restore original values. */
	roundingDiffMap = new Map<string, number>()

	applyOffsetToVec(position: VecModel): VecModel {
		return { x: position.x + this.offset.x, y: position.y + this.offset.y }
	}

	removeOffsetFromVec(position: VecModel): VecModel {
		return { x: position.x - this.offset.x, y: position.y - this.offset.y }
	}

	applyOffsetToBox(box: BoxModel): BoxModel {
		return { ...box, x: box.x + this.offset.x, y: box.y + this.offset.y }
	}

	removeOffsetFromBox(box: BoxModel): BoxModel {
		return { ...box, x: box.x - this.offset.x, y: box.y - this.offset.y }
	}

	applyOffsetToShape(shape: FocusedShape): FocusedShape {
		return this.offsetShapePartial(shape, 1) as FocusedShape
	}

	removeOffsetFromShape(shape: FocusedShape): FocusedShape {
		return this.offsetShapePartial(shape, -1) as FocusedShape
	}

	applyOffsetToShapePartial(shape: Partial<FocusedShape>): Partial<FocusedShape> {
		return this.offsetShapePartial(shape, 1)
	}

	removeOffsetFromShapePartial(shape: Partial<FocusedShape>): Partial<FocusedShape> {
		return this.offsetShapePartial(shape, -1)
	}

	private offsetShapePartial(shape: Partial<FocusedShape>, sign: 1 | -1): Partial<FocusedShape> {
		const result: Record<string, any> = { ...shape }
		for (const prop of SHAPE_POSITION_PROPS) {
			if (typeof result[prop] !== 'number') continue
			result[prop] += sign * (prop.startsWith('x') ? this.offset.x : this.offset.y)
		}
		return result as Partial<FocusedShape>
	}

	applyOffsetToContextItem(contextItem: ContextItem) {
		switch (contextItem.type) {
			case 'shape': {
				contextItem.shape = this.applyOffsetToShape(contextItem.shape)
				return contextItem
			}
			case 'shapes': {
				contextItem.shapes = contextItem.shapes.map((shape) => this.applyOffsetToShape(shape))
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

	roundContextItem(contextItem: ContextItem) {
		switch (contextItem.type) {
			case 'shape': {
				contextItem.shape = this.roundShape(contextItem.shape)
				return contextItem
			}
			case 'shapes': {
				contextItem.shapes = contextItem.shapes.map((shape) => this.roundShape(shape))
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
	 * Make a model-provided shape id unique by incrementing a trailing number,
	 * remembering the remap so later actions can still use the original id.
	 * @param id - A SimpleShapeId from the model (no "shape:" prefix).
	 */
	ensureShapeIdIsUnique(id = 'shape' as SimpleShapeId): SimpleShapeId {
		// todo: remove default and have a better handling of cases where id is undefined
		const { editor } = this.agent

		let newId = id
		while (editor.getShape(`shape:${newId}` as TLShapeId)) {
			newId = /\d+$/.test(newId)
				? (newId.replace(/(\d+)$/, (m) => (+m + 1).toString()) as SimpleShapeId)
				: (`${newId}-1` as SimpleShapeId)
		}

		if (id !== newId) {
			this.shapeIdMap.set(id, newId)
		}

		return newId
	}

	/**
	 * Resolve a model-provided shape id to a real shape, following any remap
	 * made by `ensureShapeIdIsUnique`.
	 * @returns The real id, or null if the shape doesn't exist.
	 */
	ensureShapeIdExists(id: SimpleShapeId): SimpleShapeId | null {
		const existingId = this.shapeIdMap.get(id)
		if (existingId) return existingId as SimpleShapeId
		if (this.agent.editor.getShape(createShapeId(id))) return id
		return null
	}

	/** Drop ids that don't refer to real shapes. */
	ensureShapeIdsExist(ids: SimpleShapeId[]): SimpleShapeId[] {
		return ids.map((id) => this.ensureShapeIdExists(id)).filter((v) => v !== null)
	}

	/**
	 * Round a shape's position and size, saving the diffs so they can be
	 * restored by `unroundShape`.
	 */
	roundShape(shape: FocusedShape): FocusedShape {
		return this.roundShapePartial(shape) as FocusedShape
	}

	roundShapePartial(shape: Partial<FocusedShape>): Partial<FocusedShape> {
		for (const prop of SHAPE_NUMBER_PROPS) {
			if (prop in shape) {
				shape = this.roundProperty(shape, prop as keyof Partial<FocusedShape>)
			}
		}
		return shape
	}

	/**
	 * Reverse an earlier `roundShape` so shapes don't jitter when updated.
	 */
	unroundShape(shape: FocusedShape): FocusedShape {
		for (const prop of SHAPE_NUMBER_PROPS) {
			if (prop in shape) {
				shape = this.unroundProperty(shape, prop as keyof FocusedShape)
			}
		}
		return shape
	}

	roundAndSaveNumber(number: number, key: string): number {
		const roundedNumber = Math.round(number)
		this.roundingDiffMap.set(key, roundedNumber - number)
		return roundedNumber
	}

	roundProperty<T extends Partial<FocusedShape>>(shape: T, property: keyof T): T {
		const value = shape[property]
		if (typeof value !== 'number') return shape
		;(shape[property] as number) = this.roundAndSaveNumber(
			value,
			`${shape.shapeId}_${property as string}`
		)
		return shape
	}

	unroundProperty<T extends FocusedShape>(shape: T, property: keyof T): T {
		if (typeof shape[property] !== 'number') return shape
		const diff = this.roundingDiffMap.get(`${shape.shapeId}_${property as string}`)
		if (diff === undefined) return shape
		;(shape[property] as number) += diff
		return shape
	}

	// The ensureValueIs* helpers validate loosely-typed data coming from the model.

	ensureValueIsNumber(value: any): number | null {
		if (typeof value === 'number') return value
		if (typeof value === 'string') {
			const parsedValue = parseFloat(value)
			return isNaN(parsedValue) ? null : parsedValue
		}
		return null
	}

	ensureValueIsVec(value: any): VecModel | null {
		if (!value || typeof value !== 'object') return null
		if (!('x' in value) || !('y' in value)) return null

		const x = this.ensureValueIsNumber(value.x)
		const y = this.ensureValueIsNumber(value.y)
		if (x === null || y === null) return null
		return { x, y }
	}

	ensureValueIsBoolean(value: any): boolean | null {
		if (typeof value === 'boolean') return value
		if (typeof value === 'number') return value > 0
		if (typeof value === 'string') return value !== 'false'
		return null
	}

	ensureValueIsFocusedFill(value: any): FocusedFill | null {
		const focusedFill = FocusedFillSchema.safeParse(value)
		return focusedFill.success ? focusedFill.data : null
	}

	roundBox(boxModel: BoxModel): BoxModel {
		boxModel.x = Math.round(boxModel.x)
		boxModel.y = Math.round(boxModel.y)
		boxModel.w = Math.round(boxModel.w)
		boxModel.h = Math.round(boxModel.h)
		return boxModel
	}

	roundVec(vecModel: VecModel): VecModel {
		vecModel.x = Math.round(vecModel.x)
		vecModel.y = Math.round(vecModel.y)
		return vecModel
	}
}
