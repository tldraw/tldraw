import { GroupShape } from '../editor/shapes/group/GroupShape'
import { ImageShape } from '../editor/shapes/image/ImageShape'
import { VideoShape } from '../editor/shapes/video/VideoShape'
import { AnyTLShapeInfo, TLShapeInfo } from './defineShape'

/** @public */
export const coreShapes = [
	// created by grouping interactions, probably the corest core shape that we have
	GroupShape,
	// created by copy and paste / file drop
	ImageShape,
	VideoShape,
] as const

const coreShapeTypes = new Set<string>(coreShapes.map((s) => s.type))
export function checkShapesAndAddCore(customShapes: readonly TLShapeInfo[]) {
	const shapes: AnyTLShapeInfo[] = [...coreShapes]

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
