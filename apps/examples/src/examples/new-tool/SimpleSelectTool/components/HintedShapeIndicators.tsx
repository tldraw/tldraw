import { dedupe, useEditor, useEditorComponents, useValue } from 'tldraw'

export function HintedShapeIndicator() {
	const editor = useEditor()
	const { ShapeIndicator } = useEditorComponents()

	const ids = useValue('hinting shape ids', () => dedupe(editor.getHintingShapeIds()), [editor])

	if (!ids.length) return null
	if (!ShapeIndicator) return null

	return (
		<>
			{ids.map((id) => (
				<ShapeIndicator className="tl-user-indicator__hint" shapeId={id} key={id + '_hinting'} />
			))}
		</>
	)
}
