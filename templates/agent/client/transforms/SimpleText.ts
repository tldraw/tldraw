import { TldrawAiTransform } from '@tldraw/ai'
import { TLShape } from 'tldraw'
import { TLAgentPrompt } from '../types/TLAgentPrompt'

// This transform converts a shape's rich text property to a single string, which is a much easier format for the model to deal with.
// We add the string to the shape's meta so that the model access it later on.
export class SimpleText extends TldrawAiTransform {
	override transformPrompt = (input: TLAgentPrompt) => {
		const { canvasContent, meta } = input
		const { currentPageShapes, contextItems, userSelectedShapes } = meta

		for (const shape of canvasContent.shapes) {
			shape.meta.text = this.getSimpleTextFromShape(shape)
		}

		for (const shape of currentPageShapes) {
			shape.meta.text = this.getSimpleTextFromShape(shape)
		}

		for (const shape of userSelectedShapes) {
			shape.meta.text = this.getSimpleTextFromShape(shape)
		}

		for (const contextItem of contextItems) {
			switch (contextItem.type) {
				case 'shape': {
					const shape = contextItem.shape
					shape.meta.text = this.getSimpleTextFromShape(shape)
					break
				}
				case 'shapes': {
					for (const shape of contextItem.shapes) {
						shape.meta.text = this.getSimpleTextFromShape(shape)
					}
					break
				}
			}
		}

		return input
	}

	private getSimpleTextFromShape(shape: TLShape) {
		const util = this.editor.getShapeUtil(shape.type)
		const text = util.getText(shape)
		if (text === undefined) return undefined
		return text
	}
}
