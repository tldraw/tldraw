import { useState } from 'react'
import 'tldraw/tldraw.css'
import './pdf-editor/pdf-editor.css'
import { PdfEditor } from './pdf-editor/PdfEditor'
import { Pdf, PdfPicker } from './pdf-editor/PdfPicker'

type State =
	| {
			phase: 'pick'
	  }
	| {
			phase: 'edit'
			pdf: Pdf
	  }

export default function ExamMarkingExample() {
	const [state, setState] = useState<State>({ phase: 'pick' })

	switch (state.phase) {
		case 'pick':
			return (
				<div className="PdfEditor">
					<PdfPicker onOpenPdf={(pdf) => setState({ phase: 'edit', pdf })} />
				</div>
			)
		case 'edit':
			return (
				<div className="PdfEditor">
					<PdfEditor pdf={state.pdf} />
				</div>
			)
	}
}

/*
Introduction:

This example of an exam marking tool is built on top of the `pdf-editor` example. The files specific to the pdf-editor live in the `pdf-editor` folder in this directory.
What this adds on top of the pdf editor is a custom shape that allows you mark individual questions and have their score tallied, and a custom tool that allows you create that shape.

File structure:
`add-mark-util.tsx` is a shape utility that defines the exam mark shape.
`add-mark-tool.tsx` is a custom tool that allows you to add the exam mark shape to the page.
`ExamScoreLabel.tsx` is a widget that shows the total exam score.
`ui-overrides.tsx` is a file that overrides the default toolbar and keyboard shortcuts menu to add the exam mark tool.

*/
