import { EditorProvider, useEditor } from './editor-react'

function Example() {
	const editor = useEditor()
	return <EditorProvider editor={editor}></EditorProvider>
}
