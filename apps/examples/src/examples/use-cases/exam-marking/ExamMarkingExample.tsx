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
This example is built on top of the pdf-editor example; a copy of those files lives in the
`pdf-editor` folder here. On top of that it adds:

- `add-mark-util.tsx`: the `exam-mark` shape, a numeric score input.
- `add-mark-tool.tsx`: a tool that places an exam mark where you click.
- `ExamScoreLabel.tsx`: a widget that sums every exam mark on the page.
- `ui-overrides.tsx`: adds the tool to the toolbar and keyboard shortcuts dialog.
*/
