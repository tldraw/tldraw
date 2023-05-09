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
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				width: '200px',
				height: '100%',
				backgroundColor: 'var(--palette-light-red)',
			}}
		>
			<p>Hello from the share zone!</p>
		</div>
	)
}

function CustomTopZone() {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				width: '200px',
				height: '100%',
				backgroundColor: 'var(--palette-light-blue)',
			}}
		>
			<p>Hello from the top zone!</p>
		</div>
	)
}
