import { Editor } from 'tldraw'

export function disableTransparency(editor: Editor, shapeTypes: string[]) {
	const shapeTypesSet = new Set(shapeTypes)

	editor.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
		if (!shapeTypesSet.has(shape.type)) return shape
		if (shape.opacity === 1) return shape
		return { ...shape, opacity: 1 }
	})

	editor.sideEffects.registerBeforeChangeHandler('shape', (_shapeOld, shapeNew) => {
		if (!shapeTypesSet.has(shapeNew.type)) return shapeNew
		if (shapeNew.opacity === 1) return shapeNew
		return { ...shapeNew, opacity: 1 }
	})
}
