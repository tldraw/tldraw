import React, { createContext } from 'react'
import { Editor } from '../editor/Editor'
import { IdProvider } from './useSafeId'

/** @public */
export const EditorContext = createContext<Editor | null>(null)

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

/** @public */
export function useMaybeEditor(): Editor | null {
	return React.useContext(EditorContext)
}

export function EditorProvider({
	editor,
	children,
}: {
	editor: Editor
	children: React.ReactNode
}) {
	return (
		<EditorContext.Provider value={editor}>
			<IdProvider>{children}</IdProvider>
		</EditorContext.Provider>
	)
}
