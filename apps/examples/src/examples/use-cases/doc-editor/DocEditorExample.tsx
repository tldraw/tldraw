import { useState } from 'react'
import 'tldraw/tldraw.css'
import { DocEditor } from './DocEditor'
import { Doc, DocPicker } from './DocPicker'
import './doc-editor.css'

type State = { phase: 'pick' } | { phase: 'edit'; doc: Doc }

export default function DocEditorWrapper() {
	const [state, setState] = useState<State>({ phase: 'pick' })

	switch (state.phase) {
		case 'pick':
			return (
				<div className="DocEditor">
					<DocPicker onOpenDoc={(doc) => setState({ phase: 'edit', doc })} />
				</div>
			)
		case 'edit':
			return (
				<div className="DocEditor">
					<DocEditor doc={state.doc} />
				</div>
			)
	}
}
