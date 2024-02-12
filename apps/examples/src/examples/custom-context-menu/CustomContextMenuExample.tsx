import { DefaultContextMenu, TLComponents, TLUiContextMenuProps, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomContextMenu({ children }: TLUiContextMenuProps) {
	return (
		<DefaultContextMenu>
			{/* The context menu wraps the canvas, and is the parent to the canvas */}
			<div style={{ opacity: 0.1 }}>{children}</div>
		</DefaultContextMenu>
	)
}

const components: TLComponents = {
	ContextMenu: CustomContextMenu,
}

export default function CustomContextMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
