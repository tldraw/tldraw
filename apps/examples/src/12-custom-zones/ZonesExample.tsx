import { Canvas, ContextMenu, TldrawEditor, TldrawUi } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function Example() {
	return (
		<div className="tldraw__editor">
			<TldrawEditor>
				<TldrawUi shareZone={<CustomShareZone />} topZone={<CustomTopZone />}>
					<ContextMenu>
						<Canvas />
					</ContextMenu>
				</TldrawUi>
			</TldrawEditor>
		</div>
	)
}

function CustomShareZone() {
	return (
		<div
			style={{
				backgroundColor: 'var(--palette-light-blue)',
				width: '100%',
				textAlign: 'center',
				minWidth: '80px',
			}}
		>
			<p>Share Zone</p>
		</div>
	)
}

function CustomTopZone() {
	return (
		<div
			style={{
				width: '100%',
				backgroundColor: 'var(--palette-light-green)',
				textAlign: 'center',
			}}
		>
			<p>Top Zone</p>
		</div>
	)
}
