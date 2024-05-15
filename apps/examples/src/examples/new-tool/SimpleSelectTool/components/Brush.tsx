import { useEditor, useEditorComponents, useValue } from 'tldraw'

export function BrushWrapper() {
	const editor = useEditor()
	const brush = useValue('brush', () => editor.getInstanceState().brush, [editor])
	const { Brush } = useEditorComponents()

	if (!(Brush && brush)) return null

	return <Brush className="tl-user-brush tl-brush" brush={brush} />
}
