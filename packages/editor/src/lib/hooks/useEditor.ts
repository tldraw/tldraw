import React from 'react'
import { Editor } from '../app/Editor'

export const EditorContext = React.createContext({} as Editor)

/** @public */
export const useEditor = (): Editor => {
	return React.useContext(EditorContext)
}
