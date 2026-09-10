import { Editor, TLShape } from 'tldraw'

export function disableTransparency(editor: Editor, shapeTypes: string[]) {
	const shapeTypesSet = new Set(shapeTypes)

	const forceOpaque = (shape: TLShape) =>
		shapeTypesSet.has(shape.type) && shape.opacity !== 1 ? { ...shape, opacity: 1 } : shape

	editor.sideEffects.registerBeforeCreateHandler('shape', forceOpaque)
	editor.sideEffects.registerBeforeChangeHandler('shape', (_shapeOld, shapeNew) =>
		forceOpaque(shapeNew)
	)
}
