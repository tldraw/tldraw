import { Editor } from '@tldraw/editor'
import React from 'react'

export const EditorContext = React.createContext({} as Editor)

/** @public */
export const useEditor = (): Editor => {
	return React.useContext(EditorContext)
}
