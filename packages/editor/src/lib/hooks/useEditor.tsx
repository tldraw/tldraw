import React, { createContext, useRef } from 'react'
import { Editor } from '../editor/Editor'

/** @internal */
let EditorContext: React.Context<Editor>

/**	@internal */
export function EditorContextProvider({
	editor,
	children,
}: {
	editor: Editor
	children: React.ReactNode
}) {
	const ref = useRef<React.Context<Editor>>()
	EditorContext = ref.current ?? createContext({} as Editor)
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
