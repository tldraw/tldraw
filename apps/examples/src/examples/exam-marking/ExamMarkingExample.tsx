import { useState } from 'react'
import 'tldraw/tldraw.css'
import { PdfEditor } from './PdfEditor'
import { Pdf, PdfPicker } from './PdfPicker'
import './pdf-editor.css'

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
