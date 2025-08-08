import { TLAiPrompt, TldrawAiTransform } from '@tldraw/ai'

// This transform converts a shape's rich text property to a single string, which is a much easier format for the model to deal with.
// We add the string to the shape's meta so that the model access it later on.
export class SimpleText extends TldrawAiTransform {
	override transformPrompt = (input: TLAiPrompt) => {
		for (const shape of input.canvasContent.shapes) {
			const util = this.editor.getShapeUtil(shape.type)
			const text = util.getText(shape)
			if (text === undefined) continue
			shape.meta.text = text
		}

		return input
	}
}
