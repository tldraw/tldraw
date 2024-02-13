import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	TLComponents,
	TLUiContextMenuProps,
	Tldraw,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomContextMenu(props: TLUiContextMenuProps) {
	return (
		<DefaultContextMenu {...props}>
			<DefaultContextMenuContent />
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
