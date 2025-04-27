import { TLShapeUtilConstructor } from '../editor/shapes/ShapeUtil'
import { GroupShapeUtil } from '../editor/shapes/group/GroupShapeUtil'

/** @public */
export type TLAnyShapeUtilConstructor = TLShapeUtilConstructor<any>

/** @public */
export const coreShapes = [
	// created by grouping interactions, probably the corest core shape that we have
	GroupShapeUtil,
] as const

const coreShapeTypes = new Set<string>(coreShapes.map((s) => s.type))

export function checkShapesAndAddCore(customShapes: readonly TLAnyShapeUtilConstructor[]) {
	const shapes = [...coreShapes] as TLAnyShapeUtilConstructor[]

	const addedCustomShapeTypes = new Set<string>()
	for (const customShape of customShapes) {
		if (coreShapeTypes.has(customShape.type)) {
			throw new Error(
				`Shape type "${customShape.type}" is a core shapes type and cannot be overridden`
			)
		}
		if (addedCustomShapeTypes.has(customShape.type)) {
			throw new Error(`Shape type "${customShape.type}" is defined more than once`)
		}
		shapes.push(customShape)
		addedCustomShapeTypes.add(customShape.type)
	}

	return shapes
}
