import { TLComponents, Tldraw, TLShape } from 'tldraw'

function TldrawViewer({ shape, components }: { shape: TLShape; components?: TLComponents }) {
	return (
		<div style={{ height: '100px', position: 'relative' }}>
			<div style={{ height: '100%' }}>
				<Tldraw
					hideUi
					components={components ?? {}}
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
					}}
				/>
			</div>
			<div
				style={{
					height: '100px',
					position: 'absolute',
					inset: 0,
					zIndex: 1000,
				}}
			></div>
		</div>
	)
}

export default TldrawViewer
