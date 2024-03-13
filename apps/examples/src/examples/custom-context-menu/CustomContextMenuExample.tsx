import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	TLComponents,
	TLUiContextMenuProps,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomContextMenu(props: TLUiContextMenuProps) {
	return (
		<DefaultContextMenu {...props}>
			<TldrawUiMenuGroup id="example">
				<div style={{ backgroundColor: 'thistle' }}>
					<TldrawUiMenuItem
						id="like"
						label="Like my posts"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							window.open('https://x.com/tldraw', '_blank')
						}}
					/>
				</div>
			</TldrawUiMenuGroup>
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
