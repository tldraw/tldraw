import React from 'react'
import { Editor } from '../editor/Editor'

/** @internal */
export const EditorContext = React.createContext<Editor | null>(null)

/** @public */
export function useEditor(): Editor {
	const editor = React.useContext(EditorContext)
	if (!editor) {
		throw new Error(
			'useEditor must be used inside of the <Tldraw /> or <TldrawEditor /> components'
		)
	}
	return editor
}
