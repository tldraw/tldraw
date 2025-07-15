import { TLComponents, Tldraw, TLShape } from 'tldraw'

function TldrawViewer({ shape, components }: { shape: TLShape; components?: TLComponents }) {
	return (
		<div className="tldraw-viewer">
			<Tldraw
				hideUi
				components={components ?? {}}
				inferDarkMode={false}
				onMount={(editor) => {
					editor.createShape(shape)
					editor.updateInstanceState({ isReadonly: true })
					const bounds = editor.getShapePageBounds(shape.id)
					if (!bounds) {
						editor.setCameraOptions({ isLocked: true })
						return
					}
					editor.zoomToBounds(bounds, { inset: 20 })
					editor.setCameraOptions({ isLocked: true })
					editor.blur()
				}}
			/>
		</div>
	)
}

export default TldrawViewer
