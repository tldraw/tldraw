import { Control, Editor } from '@tldraw/tldraw'
import { SpeechBubbleShape } from './SpeechBubbleUtil'

export function speechBubbleControl(editor: Editor) {
	// we only show the control in select.idle
	if (!editor.isIn('select.idle')) return null

	// it's only relevant when we have a single speech bubble shape selected
	const shape = editor.getOnlySelectedShape()
	if (!shape || !editor.isShapeOfType<SpeechBubbleShape>(shape, 'speech-bubble')) {
		return null
	}

	// return the control - this handles the actual interaction.
	return new SpeechBubbleControl(shape)
}

class SpeechBubbleControl extends Control {
	constructor(readonly shape: SpeechBubbleShape) {
		super()
	}
}
