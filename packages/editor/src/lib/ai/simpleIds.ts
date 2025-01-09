import { TLShapeId } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { GenerativeAiTransform } from './GenerativeModel'

/** @internal */
export const simpleIds: GenerativeAiTransform = {
	create(input) {
		const originalToSimple = new Map<TLShapeId, TLShapeId>()
		const simpleToOriginal = new Map<TLShapeId, TLShapeId>()
		let nextSimpleId = 1

		for (const shape of input.shapes) {
			originalToSimple.set(shape.id, `${nextSimpleId}` as TLShapeId)
			simpleToOriginal.set(`${nextSimpleId}` as TLShapeId, shape.id)
			nextSimpleId++
		}

		return {
			transformInput: () => {
				// TODO: deal with nested IDs by looking at schema
				return {
					...input,
					shapes: input.shapes.map((shape) => ({
						...shape,
						id: originalToSimple.get(shape.id)!,
					})),
				}
			},
			transformChange: (change) => {
				switch (change.type) {
					case 'createShape':
						return {
							...change,
							shape: {
								...change.shape,
								id: simpleToOriginal.get(change.shape.id)!,
							},
						}
					case 'updateShape':
						return {
							...change,
							shape: {
								...change.shape,
								id: simpleToOriginal.get(change.shape.id)!,
							},
						}
					case 'deleteShape':
						return {
							...change,
							shapeId: simpleToOriginal.get(change.shapeId)!,
						}
					default:
						return exhaustiveSwitchError(change)
				}
			},
		}
	},
}
