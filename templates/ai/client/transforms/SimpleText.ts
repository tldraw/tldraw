import { TLAiPrompt, TldrawAiTransform } from '@tldraw/ai'

// Store a string version of each shape's rich text before sending it to the model
export class SimpleText extends TldrawAiTransform {
	override transformPrompt = (input: TLAiPrompt) => {
		const { canvasContent } = input

		for (const s of canvasContent.shapes) {
			if (!('richText' in s.props)) {
				continue
			}
			const util = this.editor.getShapeUtil(s)
			s.meta.text = util.getText(s)
		}

		return input
	}
}
