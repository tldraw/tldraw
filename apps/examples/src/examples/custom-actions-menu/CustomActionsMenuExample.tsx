import {
	CustomActionsMenu,
	DefaultActionsMenu,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function CustomActionsMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<CustomActionsMenu>
					<DefaultActionsMenu />
					<CustomMenuItem />
				</CustomActionsMenu>
			</Tldraw>
		</div>
	)
}

function CustomMenuItem() {
	return (
		<TldrawUiMenuGroup id="custom stuff">
			<TldrawUiMenuItem
				id="about"
				label="Like my posts"
				icon="external-link"
				readonlyOk
				onSelect={() => {
					window.open('https://x.com/tldraw', '_blank')
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
