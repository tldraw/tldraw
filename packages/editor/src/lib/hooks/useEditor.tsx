import React, { createContext } from 'react'
import { Editor } from '../editor/Editor'

/** @internal */
const EditorContext: React.Context<Editor> = createContext({} as Editor)

/**	@internal */
export function EditorContextProvider({
	editor,
	children,
}: {
	editor: Editor
	children: React.ReactNode
}) {
	return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}

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
